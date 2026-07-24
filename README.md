# WELCOME TO BABYTIMEMAPPER
BabyTimemapper is a program that is directly based off of <a ref="https://github.com/okfn/timemapper">Timemapper</a> by <a ref="https://github.com/okfn">okfn</a> (Open Knowledge Foundation) but updated to be stylized and run smoother with local based data input. 

You can run this program through GitHub cloning or you can download the zipped directory if gitclone isnt available to you.

For those looking to use the GitHub based method, you can follow these steps to do so!

# BabyTimeMapper Crash Course!

## Installing NODEJS
First thing that everyone should do is install NODEJS to their system:
### For MAC: 
```
# Download and install Homebrew if not already installed 
curl -o- https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash
# Download and install Node.js:
brew install node@24
# Verify the Node.js version:
node -v # Should print "v24.18.0" or whatever the latest version is.
# Verify npm version:
npm -v # Should print "11.16.0" or whatever the latest version is.
```

### For Windows:
```
# Download and install Chocolatey:
powershell -c "irm https://community.chocolatey.org/install.ps1|iex"
# Download and install Node.js:
choco install nodejs --version="26.5.0"
# Verify the Node.js version:
node -v # Should print "v26.5.0".
# Verify npm version:
npm -v # Should print "11.17.0".
```
### You can also go to https://nodejs.org/en/download/current and download a prebuilt Node.js

## Make sure to gitclone the repo to your local directory before the next step!

## Installing the node modules for BabyTimeMapper
For the node files you will need to run the program, you will need to run an install, the command is:
```
npm install
```

