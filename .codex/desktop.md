目标栏：C:\Windows\System32\wscript.exe "C:\Users\Administrator\bin\codex_app.vbs"
wscript.exe Windows 脚本宿主（WSH）的 GUI 版本。
cscript.exe 是Windows控制台版本。用 wscript.exe 执行脚本时不会弹出命令行窗口
以下是codex_app.vbs文件内容，启动过程中不会弹出命令行一闪而过的界面：	
' Codex Desktop Launcher - no console flash
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """C:\Users\Administrator\AppData\Local\OpenAI\Codex\bin\8e8bf206e63ac436\codex.exe"" app", 0, False