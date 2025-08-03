# Viper
> Making FPGAs more accesible to everyone through the power of AI.

## ⚠️ **PLEASE READ** ⚠️

### **macOS Users - Important Installation Instructions**

If you're downloading Viper Desktop for macOS, you may see a "damaged" or "can't be opened" message. This is normal for unsigned apps downloaded from the internet.

**To run the app:**
1. Right-click on "Viper Desktop.app"
2. Select "Open" from the context menu
3. Click "Open" in the security dialog that appears

**Alternative method:**
If the above doesn't work, open Terminal and run:
```bash
xattr -d com.apple.quarantine "Viper Desktop.app"
```

This is a macOS security feature, not a bug in the app. The app is safe to use!
## Overview and Features
* Based on Monaco Editor
* Next.js for web and electron.js for desktop
* Built in terminal and syntax check features for Verilog and System Verilog
* Built in File add/delete/edit system
* Bitstream Generation for Ice40 boards through APIO
* AI minibar and sidebar for program support
* Currently only supports the generation of the file structure in [this](https://github.com/mjoldfield/ice40-blinky) repositiory. (Please use it to replicate your file system)
## Acknowledgements 
Thanks to [Hackclub](hackclub.com) for providing the Llama models used in this project for free. 

