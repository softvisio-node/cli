module.exports = function ( api ) {
    api.cache( true );

    return {
        "plugins": ["@babel/plugin-syntax-top-level-await"],
        "presets": [
            ["@babel/preset-env", { "shippedProposals": true }],
            ["@vue/app", { "decoratorsLegacy": false, "decoratorsBeforeExport": true }],
        ],
    };
};
