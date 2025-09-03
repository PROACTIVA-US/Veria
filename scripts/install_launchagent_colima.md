
# LaunchAgent to auto-start Colima on login (optional)

1. Copy `infra/launch_agents/io.colima.start.plist` to `~/Library/LaunchAgents/`  
2. Load it:
   ```bash
   launchctl load ~/Library/LaunchAgents/io.colima.start.plist
   launchctl start io.colima.start
   ```
3. Unload:
   ```bash
   launchctl unload ~/Library/LaunchAgents/io.colima.start.plist
   ```
