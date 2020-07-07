const icons = {

    // android
    "android/icons/ldpi.png": [36, 36],
    "android/icons/mdpi.png": [48, 48],
    "android/icons/hdpi.png": [72, 72],
    "android/icons/xhdpi.png": [96, 96],
    "android/icons/xxhdpi.png": [144, 144],
    "android/icons/xxxhdpi.png": [192, 192],

    // android default notification icons, monochrome
    "android/icons/notification-default/mdpi.png": [24, 24, true],
    "android/icons/notification-default/hdpi.png": [36, 36, true],
    "android/icons/notification-default/xhdpi.png": [48, 48, true],
    "android/icons/notification-default/xxhdpi.png": [72, 72, true],
    "android/icons/notification-default/xxxhdpi.png": [96, 96, true],

    // android default large notification icons, color
    "android/icons/notification-default/notification-icon-large.png": [256, 256],

    // electron
    "electron/icons/icon.png": [256, 256],

    // ios
    // iPhone 6 Plus
    "ios/icons/icon-60@3x.png": [180, 180],

    // iOS 7.0+
    // iPhone / iPod Touch
    "ios/icons/icon-60.png": [60, 60],
    "ios/icons/icon-60@2x.png": [120, 120],

    // iPad
    "ios/icons/icon-76.png": [76, 76],
    "ios/icons/icon-76@2x.png": [152, 152],

    // Spotlight Icon
    "ios/icons/icon-40.png": [40, 40],
    "ios/icons/icon-40@2x.png": [80, 80],

    // iOS 6.1
    // iPhone / iPod Touch
    "ios/icons/icon.png": [57, 57],
    "ios/icons/icon@2x.png": [114, 114],

    // iPad
    "ios/icons/icon-72.png": [72, 72],
    "ios/icons/icon-72@2x.png": [144, 144],

    // iPad Pro
    "ios/icons/icon-167.png": [167, 167],

    // iPhone Spotlight and Settings Icon
    "ios/icons/icon-small.png": [29, 29],
    "ios/icons/icon-small@2x.png": [58, 58],
    "ios/icons/icon-small@3x.png": [87, 87],

    // iPad Spotlight and Settings Icon
    "ios/icons/icon-50.png": [50, 50],
    "ios/icons/icon-50@2x.png": [100, 100],

    // iPad Pro
    "ios/icons/icon-83.5@2x.png": [167, 167],
};

module.exports = class {
    static cli () {
        return {
            "summary": "Generate icons for cordova project.",
            "description": `Run it from project resources directory.`,
            "arguments": {
                "icon": {
                    "summary": "Original icon, should be 1024 x 1024 .png in good quality.",
                    "minItems": 1,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const jimp = require( "jimp" ),
            fs = require( "@softvisio/core/fs" ),
            tree = new fs.fileTree();

        var img = await jimp.read( process.cli.arguments.icon );

        for ( const name in icons ) {
            console.log( name );

            const icon = img.clone().resize( icons[name][0], icons[name][1], jimp.RESIZE_BICUBIC );

            if ( icons[name][2] ) icon.greyscale();

            tree.add( name, await icon.getBufferAsync( jimp.MIME_PNG ) );
        }

        tree.write( "." );
    }
};
