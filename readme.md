# My Own Reflect
A dead simple module parser that can be hosted in your own code.

[![Build Status](https://travis-ci.org/ktutnik/my-own-reflect.svg?branch=master)](https://travis-ci.org/ktutnik/my-own-reflect)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/my-own-reflect/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/my-own-reflect?branch=master)

## Motivation
My Own Reflect is a module parser library, it parse all exported functions and classes inside a module into Abstract Syntax Tree. 

## How to Use It
Example you have a file with classes like below:

```typescript
//filename: src/mock.ts
export function myFun(firstPar: string, secondPar: string) { }
export function myOtherFun() { }

export class MyClass {
    myMethod(firstPar: string, secondPar: string) { }
    myOtherMethod(){}
}
```
You can retrieve AST from above module using:

```typescript
//filename: src/index.ts
import {reflect} from "./reflect"

const result = reflect("./mock")
```

The result will be like below:

```javascript
{
    type: 'Object',
    name: 'module',
    members: [{
        type: 'Function',
        name: 'myFun',
        parameters:
            [{ type: 'Parameter', name: 'firstPar' },
            { type: 'Parameter', name: 'secondPar' }]
    },
    { type: 'Function', name: 'myOtherFun', parameters: [] },
    {
        type: 'Class',
        name: 'MyClass',
        methods:
            [{
                type: 'Function',
                name: 'myMethod',
                parameters:
                    [{ type: 'Parameter', name: 'firstPar' },
                    { type: 'Parameter', name: 'secondPar' }]
            },
            { type: 'Function', name: 'myOtherMethod', parameters: [] }]
    }]
}
```

The parameter of the `reflect` method is the path of the module that will be parsed, it is respect the JavaScript import naming such as absolute `"./module"`, `"/path/of/module"`, relative `"../../module"` or global `"module"`