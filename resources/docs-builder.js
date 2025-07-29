#!/usr/bin/env node

const options = JSON.parse( process.argv[ 2 ] );

const { "default": Components } = await import( options.componentsUrl ),
    components = new Components( options.appUrl );

// load app components
var res = components.load();
if ( !res.ok ) throw res;

const data = {};

for ( const type in options.types ) {

    // get schema
    res = components.getSchema( type );
    if ( !res.ok ) throw res;
    const schema = res.data;

    res = await schema.generate( options.types[ type ] );
    if ( !res.ok ) throw res;
    const fileTree = res.data;

    for ( const file of fileTree ) {
        data[ type + "/" + file.path ] = await file.text();
    }
}

process.stdout.write( JSON.stringify( data ) );
process.stdout.end();
