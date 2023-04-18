Get-ChildItem -Recurse -include *.svg | ForEach-Object {$_.FullName} | Out-File files.txt
