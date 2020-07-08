module.exports = class {
    static cli () {
        return {
            "summary": "Build and push docker images.",
            "options": {
                "remove": {
                    "summary": "Remove images after build.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "push": {
                    "summary": "Push images.",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "tag": {
                    "summary": "Git branch or tag. If not defined image will be built from the current working copy.",
                    "maxItems": 1,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {}
};
