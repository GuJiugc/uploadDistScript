@echo off
chcp 65001
set /p UserInput=请输入要发版的项目: 
node ./upload.js %UserInput%
@pause