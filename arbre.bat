@echo off
REM ============================================================================
REM  arbre.bat — llançador del menú de l'Arbre de Fites.
REM  Doble clic i ja està. Tota la lògica viu a eines\menu.ps1, perquè el .bat
REM  de Windows es porta fatal amb els accents.
REM ============================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0eines\menu.ps1"
