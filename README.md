# BLE_SportsTracker_rPi
1. Use node 8.16.2

2. Install drivers
```
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

3. Correct permissions for node to use the bluetooth adapter
```
sudo setcap cap_net_raw+eip $(eval readlink -f which node)
```

4. Edit node_modules/noble/lib/hci-socket/hci.js createLeConn function
```
cmd.writeUInt16LE(0x0016, 17); // min interval
cmd.writeUInt16LE(0x0032, 19); // max interval
```
