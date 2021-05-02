import Command from "../command.js";

const icons = {
    "android": {
        "android/icons/ldpi.png": { "w": 36, "h": 36 },
        "android/icons/mdpi.png": { "w": 48, "h": 48 },
        "android/icons/hdpi.png": { "w": 72, "h": 72 },
        "android/icons/xhdpi.png": { "w": 96, "h": 96 },
        "android/icons/xxhdpi.png": { "w": 144, "h": 144 },
        "android/icons/xxxhdpi.png": { "w": 192, "h": 192 },

        // android default notification icons, monochrome
        "android/icons/notification-default/mdpi.png": { "w": 24, "h": 24, "greyscale": true },
        "android/icons/notification-default/hdpi.png": { "w": 36, "h": 36, "greyscale": true },
        "android/icons/notification-default/xhdpi.png": { "w": 48, "h": 48, "greyscale": true },
        "android/icons/notification-default/xxhdpi.png": { "w": 72, "h": 72, "greyscale": true },
        "android/icons/notification-default/xxxhdpi.png": { "w": 96, "h": 96, "greyscale": true },

        // android default large notification icons, color
        "android/icons/notification-default/notification-icon-large.png": { "w": 256, "h": 256 },
    },

    "electron": {
        "electron/icons/icon.png": { "w": 256, "h": 256 },
    },

    "ios": {
        "ios/icons/icon-20.png": { "w": 20, "h": 20 },
        "ios/icons/icon-20@2x.png": { "w": 40, "h": 40 },
        "ios/icons/icon-20@3x.png": { "w": 60, "h": 60 },
        "ios/icons/icon-40.png": { "w": 40, "h": 40 },
        "ios/icons/icon-40@2x.png": { "w": 80, "h": 80 },
        "ios/icons/icon-50.png": { "w": 50, "h": 50 },
        "ios/icons/icon-50@2x.png": { "w": 100, "h": 100 },
        "ios/icons/icon-60@2x.png": { "w": 120, "h": 120 },
        "ios/icons/icon-60@3x.png": { "w": 180, "h": 180 },
        "ios/icons/icon-72.png": { "w": 72, "h": 72 },
        "ios/icons/icon-72@2x.png": { "w": 144, "h": 144 },
        "ios/icons/icon-76.png": { "w": 76, "h": 76 },
        "ios/icons/icon-76@2x.png": { "w": 152, "h": 152 },
        "ios/icons/icon-83.5@2x.png": { "w": 167, "h": 167 },
        "ios/icons/icon-1024.png": { "w": 1024, "h": 1024 },
        "ios/icons/icon-29.png": { "w": 29, "h": 29 },
        "ios/icons/icon-29@2x.png": { "w": 58, "h": 58 },
        "ios/icons/icon-29@3x.png": { "w": 87, "h": 87 },
        "ios/icons/icon.png": { "w": 57, "h": 57 },
        "ios/icons/icon@2x.png": { "w": 114, "h": 114 },
        "ios/icons/icon-24@2x.png": { "w": 48, "h": 48 },
        "ios/icons/icon-27.5@2x.png": { "w": 55, "h": 55 },
        "ios/icons/icon-44@2x.png": { "w": 88, "h": 88 },
        "ios/icons/icon-86@2x.png": { "w": 172, "h": 172 },
        "ios/icons/icon-98@2x.png": { "w": 196, "h": 196 },
    },
};

export default class extends Command {
    static cli () {
        return {
            "summary": "Generate icons for cordova project.",
            "description": `Run it from project resources directory.`,
            "options": {
                "android": {
                    "summary": "Generate icons for android only.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "electron": {
                    "summary": "Generate icons for electron only.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "ios": {
                    "summary": "Generate icons for iOS only.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
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
        const { "default": jimp } = await import( "jimp" ),
            fs = await import( "@softvisio/core/fs" ),
            tree = new fs.FileTree();

        var img = await jimp.read( process.cli.arguments.icon );

        const osFilter = process.cli.options.android || process.cli.options.electron || process.cli.options.ios;

        for ( const os in icons ) {
            if ( osFilter && !process.cli.options[os] ) continue;

            for ( const name in icons[os] ) {
                console.log( name );

                const icon = img.clone().resize( icons[os][name].w, icons[os][name].h, jimp.RESIZE_BICUBIC );

                if ( icons[os][name].greyscale ) icon.greyscale();

                tree.add( name, await icon.getBufferAsync( jimp.MIME_PNG ) );
            }
        }

        const rootPackage = this._findRootPackage();

        if ( rootPackage ) {
            tree.write( rootPackage.root + "/resources" );
        }
        else {
            tree.write( "." );
        }
    }
}
