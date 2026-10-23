@echo off
echo ========================================================
echo   Starting NexGen Banking Java Spring Boot REST API
echo ========================================================
cd backend
if exist "mvnw.cmd" (
    call mvnw.cmd spring-boot:run
) else (
    mvn spring-boot:run
)
pause
