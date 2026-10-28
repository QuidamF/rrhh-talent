import time
import json
import redis
import asyncio
import logging
from app.config import settings
from app.database import SessionLocal
from app.routers.webhook_listener import process_chat_message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rh.worker")

async def worker_loop():
    logger.info("Initializing Octopy Talento Redis Worker...")
    r = redis.Redis.from_url(settings.redis_url)
    
    # Wait for Redis connection to be alive
    while True:
        try:
            r.ping()
            logger.info("Successfully connected to Redis.")
            break
        except Exception as e:
            logger.warning(f"Waiting for Redis connection... {e}")
            await asyncio.sleep(2)
            
    logger.info("Listening for tasks in queue: 'octopy_chat_tasks' & 'jpm_chat_tasks'...")
    while True:
        try:
            # brpop supports multiple keys in order of priority
            task = r.brpop(["octopy_chat_tasks", "jpm_chat_tasks"], timeout=5)
            if not task:
                continue
                
            _, payload_bytes = task
            payload = json.loads(payload_bytes)
            
            candidate_id = payload.get("candidate_id")
            actor_id = payload.get("actor_id")
            channel = payload.get("channel")
            body = payload.get("body", "")
            task_type = payload.get("content_type", "text")
            media_id = payload.get("media_id")
            
            logger.info(f"Processing task for candidate_id: {candidate_id}, type: {task_type}")
            if task_type in ("image", "document") or media_id:
                from app.routers.webhook_listener import process_id_document
                await process_id_document(
                    candidate_id=candidate_id,
                    actor_id=actor_id,
                    channel=channel,
                    media_id=media_id,
                    db_session_factory=SessionLocal
                )
            else:
                await process_chat_message(
                    candidate_id=candidate_id,
                    actor_id=actor_id,
                    channel=channel,
                    user_message=body,
                    db_session_factory=SessionLocal
                )
            logger.info(f"Finished task for candidate_id: {candidate_id}")
            
        except Exception as e:
            logger.error(f"Error in worker processing loop: {e}")
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(worker_loop())
