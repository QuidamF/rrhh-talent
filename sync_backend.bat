@echo off
echo Sincronizando backend con el contenedor rh_backend...
docker cp backend/app/. rh_backend:/app/app/
echo.
echo Ejecutando migracion de esquema de base de datos...
docker exec rh_backend python app/migrate_schema.py
echo.
echo Ejecutando semillero de roles y usuarios RBAC...
docker exec rh_backend python app/seed_rbac.py
echo.
echo Reiniciando contenedor backend...
docker restart rh_backend
echo.
echo Sincronizacion completada con exito.
