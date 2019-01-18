# tinspector
TypeScript type inspector

[![Build Status](https://travis-ci.org/ktutnik/tinspector.svg?branch=master)](https://travis-ci.org/ktutnik/tinspector)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/tinspector/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/tinspector?branch=master)

## Description
tinspector is a type inspector used to extract metadata from JavaScript (TypeScript generated) Function, Class, Module


## Simple Reflect

```typescript
import reflect from "tinspector"

class MyAwesomeClass {
    constructor(id:number, name:string){}
    myAwesomeMethod(stringPar:string){}
}

const metadata = reflect(MyAwesomeClass)
/*
metadata: 
{
    kind: "Class",
    name: "MyAwesomeClass",
    ...
    ctor: {
        kind: "Contructor",
        ...
        parameters: [{
            kind: "Parameter",
            name: "id",
            ...
        },{
            kind: "Parameter",
            name: "name",
            ...
        }]
    },
    methods: [{
        kind: "Function",
        name: "myAwesomeMethod",
        ...
        parameters: [{
            kind: "Parameter",
            name: "stringPar",
            ...
        }]
    }]
}
*/
```

## Reflect With Type Information
TypeScript provided design type information by using decorator. 
To get a proper type information on function parameter and its return type 
you can use noop decorator (decorator that does nothing).
* To get type information of constructor parameter decorate the class
* To get type information of method/property decorate the method/property itself

```typescript
import reflect, { decorate } from "tinspector"

@decorate({})
class MyAwesomeClass {
    constructor(id:number, name:string){}

    @decorate({})
    myAwesomeMethod(stringPar:string): number { return 1 }
}

const metadata = reflect(MyAwesomeClass)
/*
metadata: 
{
    kind: "Class",
    name: "MyAwesomeClass",
    ...
    ctor: {
        kind: "Contructor",
        ...
        parameters:[{
            kind: "Parameter",
            name: "id",
            type: Number, <--- type information
            ...
        },{
            kind: "Parameter",
            name: "name",
            type: String, <--- type information
            ...
        }]
    },
    methods: [{
        kind: "Function",
        name: "myAwesomeMethod",
        returnType: Number, <--- type information
        ...
        parameters: [{
            kind: "Parameter",
            name: "stringPar",
            type: String, <--- type information
            ...
        }]
    }]
}
*/
```

## Reflect With Decorator Information
Use predefined decorator `decorate`, `decorateClass`, `decorateMethod`, `decorateProperty`, `decorateParameter` to add 
decorator informaton that understand by `reflect`

```typescript
import reflect, { decorateMethod } from "tinspector"

class MyAwesomeClass {
    @decorateMethod({ type: "Cache", cache: '60s' })
    myAwesomeMethod(stringPar:string){}
}

const metadata = reflect(MyAwesomeClass)
/*
metadata: 
{
    kind: "Class",
    name: "MyAwesomeClass",
    ...
    methods: [{
        kind: "Function",
        name: "myAwesomeMethod",
        decorators: [{ 
            type: "Cache", 
            cache: '60s' 
        }] 
        ...
    }]
}
*/
```

## Reflect Parameter Properties
TypeScript parameter properties information erased after transpile, so you need to tell tinspector 
that you have parameter properties by decorate class using `@reflect.parameterProperties()`

```typescript
import reflect from "tinspector"

@reflect.parameterProperties()
class MyAwesomeClass {
    constructor(public id:number, public name:string){}
}

const metadata = reflect(MyAwesomeClass)

/*
metadata: 
{
    kind: "Class",
    name: "MyAwesomeClass",
    ...
    ctor: {
        kind: "Contructor",
        ...
        parameters:[{
            kind: "Parameter",
            name: "id",
            type: Number,
            ...
        },{
            kind: "Parameter",
            name: "name",
            type: String,
            ...
        }]
    },
    properties: [{
        kind: "Parameter",
        name: "id",
        type: Number,
        ...
    },{
        kind: "Parameter",
        name: "name",
        type: String,
        ...
    }]
}
*/
```

> `@reflect.parameterProperties()` assume that all of the class parameter is parameter property, 
> to exclude parameter from transformed into property use `@reflect.ignore()`

```typescript
@reflect.parameterProperties()
class MyAwesomeClass {
    constructor(public id:number, public name:string, @reflect.ignore() nonProperty:string){}
}
```

## Reflect With Inheritance
tinspector will traverse through base classes property to get proper meta data.

```typescript
class BaseClass {
    @decorate({})
    myAwesomeMethod(stringPar:string): number { return 1 }
}
class MyAwesomeClass {
    @decorate({})
    myAwesomeMethod(stringPar:string): number { return 1 }
}




```


## Ignore Member From Metadata Generated

## Reflect Array Element Type

## Reflect Generic Type