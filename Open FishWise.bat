@echo off
rem Double-click to run FishWise SG locally. Keep this window open while you browse.
cd /d "%~dp0"
python serve.py 5180
if errorlevel 1 py serve.py 5180
pause
