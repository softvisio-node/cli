#!/usr/bin/env node

import { suite, test } from "node:test";
import assert from "node:assert";

suite( "git", () => {
    suite( "git-branch-parser", () => {
        const BRANCH_RE = /^(?<current>\*)? +(?:\((?<head>HEAD)[^)]+\)|(?<branch>[^ ]+)) +(?<hash>[\da-z]+)(?: \[ahead (?<ahead>\d+)])? (?<description>.+)/;

        const tests = [

            //
            [ `  main fa469cf [ahead 1] feat: docker add git labels on build`, { "branch": "main", "ahead": "1" } ],
            [ `* (HEAD detached at latest) a938d78 [ahead 10] release: v0.1.7`, { "branch": undefined, "head": "HEAD", "ahead": "10" } ],
            [ `  main fa469cf feat: docker add git labels on build`, { "branch": "main", "ahead": undefined } ],
            [ `* (HEAD detached at latest) a938d78 release: v0.1.7`, { "branch": undefined, "head": "HEAD", "ahead": undefined } ],
        ];

        for ( let n = 0; n < tests.length; n++ ) {
            test( "test_" + n, () => {
                const match = tests[ n ][ 0 ].match( BRANCH_RE );

                if ( !match ) throw Error( `Parsing error: ` + tests[ n ][ 0 ] );

                for ( const prop in tests[ n ][ 1 ] ) {
                    assert.strictEqual( tests[ n ][ 1 ][ prop ], match.groups[ prop ] );
                }
            } );
        }
    } );
} );
