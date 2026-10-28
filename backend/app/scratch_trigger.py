import asyncio
import json
from app.database import SessionLocal
from app import models
from app.services.ai_service import get_ai_service, get_active_model_name

async def force_generate_summary():
    db = SessionLocal()
    try:
        # Find candidate with active telegram chat ID (most recently created)
        candidate = db.query(models.Candidate).filter(
            models.Candidate.telegram_chat_id != None
        ).order_by(models.Candidate.created_at.desc()).first()
        
        if not candidate:
            print("Candidate with active telegram_chat_id not found.")
            return
            
        print(f"Found Candidate: {candidate.name} (ID: {candidate.id}, Chat ID: {candidate.telegram_chat_id})")
        
        # Get chat messages
        msgs = db.query(models.ChatMessage).filter(
            models.ChatMessage.candidate_id == candidate.id
        ).order_by(models.ChatMessage.created_at.asc()).all()
        
        if not msgs:
            print("No chat messages found for this candidate.")
            return
            
        print(f"Found {len(msgs)} chat messages. Constructing history context...")
        history_text = ""
        for m in msgs:
            role = "Usuario" if m.direction == "inbound" else "OctyBot"
            history_text += f"{role}: {m.body}\n"
            
        print("Contacting AI Service...")
        ai_service = get_ai_service()
        prompt = f"""
        Genera un resumen estructurado de la pre-entrevista de este candidato para el equipo de Recursos Humanos de Octopy.
        Incluye:
        - Experiencia comercial o técnica detectada
        - Pretensión económica y disponibilidad de horario/modalidad
        - Comportamiento y facilidad de palabra (si fue cooperativo, desenvuelto, etc.)
        
        Conversación:
        {history_text}
        
        Resumen ejecutivo breve (máximo 150 palabras):
        """
        
        ai_data = await ai_service.generate_text(
            prompt=prompt,
            system_prompt="Eres un asistente de reclutamiento de Octopy. Genera resúmenes ejecutivos breves de la entrevista."
        )
        
        print(f"Summary generated successfully:\n{ai_data}")
        
        # Wipe previous notes with this header if any to prevent duplicates
        db.query(models.Note).filter(
            models.Note.candidate_id == candidate.id,
            models.Note.author.in_(["OctyBot (Asistente IA)", "Samanta (Asistente IA)"])
        ).delete()
        
        db_note = models.Note(
            candidate_id=candidate.id,
            content=f"📋 **Resumen de Pre-entrevista (OctyBot IA)**:\n\n{ai_data.strip()}",
            author="OctyBot (Asistente IA)"
        )
        db.add(db_note)
        db.commit()
        print("Note created successfully in database!")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(force_generate_summary())
