## Navigation bar
Each panel contains:
← → ↑ ⟳ 🏠 ★
[path textbox]
[filter]

## Path textbox
Example:
/var/www/html
goToPath('/var/www/html')

## Bookmark
Bookmarks
+ Add
Production
Development
Upload
[Edit]
[Delete]

Stored as JSON:
{
  "id": "...",
  "name": "Production",
  "path": "/var/www/html"
}

## Context menu
### Empty area
New Folder
New File
Refresh

- Refresh:
  - reload current directory
  - reload parent directory cache

### Folder
Open
Rename
Delete
New Folder
New File
Permissions
Properties
Copy
Cut
Refresh
Copy Path

### File
Edit
Rename
Delete
Permissions
Properties
Copy
Cut
Copy Path

### Permission dialog
- Linux style:
    Owner
        Read
        Write
        Execute

    Group
        Read
        Write
        Execute

    Other
        Read
        Write
        Execute

- Display:
755
644
777

### Properties
Name
Size
Owner
Group
Created
Modified
Permission
- Remote: sftp.stat()
- Local: fs.stat()

### Copy/Cut
local -> local
remote -> remote
local -> remote
remote -> local

### Editor (Monaco Editor)

#### File editing mechanism
- Files are not edited directly over SFTP. Instead:
Remote file
↓
download
↓
temp file
↓
Monaco
↓
save
↓
upload

- Workflow:
open file
↓
download
↓
~/.tabby-sftp-cache
↓
edit
↓
Ctrl + S
↓
upload
↓
done

### Cache
Example:
~/.config/tabby-sftp/
cache/
bookmarks.json
settings.json
temp/

### Auto Upload
Ctrl + S runs upload().
On error: Failed to upload file
Retry
Discard
Keep local

### File Watching
If the temporary file is modified, mark it as unsaved.

### Settings Tab
In Tabby Settings: SFTP Explorer
Options:
- Theme
- Icon Style
- Default Download Folder
- Temp Folder
- Max Cache Size
- Open File Size Limit
- Auto Upload
- Confirm Delete
- Show Hidden Files

### Main services
- SftpService
- LocalFsService
- BookmarkService
- EditorService
