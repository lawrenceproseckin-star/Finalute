# Testing Finalute on a Local Network

This guide explains how to run Finalute on your local network, allowing you to access it from other devices.

## Prerequisites

- Node.js installed on your machine
- Finalute project set up and dependencies installed

## Starting the Local Network Server

1. Install dependencies (if you haven't already):
   ```
   npm install
   ```

2. Start the server:
   ```
   npm run server
   ```
   
   Alternatively, you can run:
   ```
   node src/server/server.js
   ```

3. The server will start and display a message like:
   ```
   Finalute server running at http://0.0.0.0:3000
   Access from other devices on your network using your machine's IP address
   For example: http://<your-ip-address>:3000
   ```

## Accessing from Other Devices

To access Finalute from other devices on your local network:

1. Find your computer's IP address:
   - On macOS: Open System Preferences > Network or run `ifconfig` in Terminal
   - On Windows: Run `ipconfig` in Command Prompt
   - On Linux: Run `ip addr show` or `ifconfig` in Terminal

2. On other devices, open a web browser and navigate to:
   ```
   http://<your-ip-address>:3000
   ```
   
   Replace `<your-ip-address>` with your actual IP address (e.g., 192.168.1.5)

## Available Endpoints

- **Web Interface**: `http://<your-ip-address>:3000`
- **Status API**: `http://<your-ip-address>:3000/api/status`
- **Tab Roots API**: `http://<your-ip-address>:3000/api/tabroots`
- **Anchor API**: `http://<your-ip-address>:3000/api/anchor` (POST multipart form with `fileRoot` and `proof` file)
- **Output Files**: `http://<your-ip-address>:3000/out/...`

## Stopping the Server

To stop the server, press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

- **Cannot access from other devices**: Check your firewall settings to ensure port 3000 is allowed
- **Tab roots not found**: Run the commit command first to generate tab roots
- **Anchor fails**: Ensure `fileRoot` corresponds to the proof you generated and the `.proof` file is valid
- **Server crashes**: Check the terminal for error messages