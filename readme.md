# tinspector
TypeScript type inspector

[![Build Status](https://travis-ci.org/plumier/tinspector.svg?branch=master)](https://travis-ci.org/plumier/tinspector)
[![Coverage Status](https://coveralls.io/repos/github/plumier/tinspector/badge.svg?branch=master)](https://coveralls.io/github/plumier/tinspector?branch=master) 
[![Greenkeeper badge](https://badges.greenkeeper.io/plumier/tinspector.svg)](https://greenkeeper.io/)

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

## Override Type Information
Tinspector uses TypeScript design type metadata information, 
TypeScript doesn't provide enough information about some complex data type such as: 
* Array item data type
* Any generic type such as `Partial` `Promise` etc 
To do so, you need to specify  the type manually by using `@reflect.type()`

### Array
Array type can be defined by providing array of the type like example below

```typescript 
@decorate({})
class MyAwesomeClass {
    constructor(
        @reflect.type([Number])
        public numbers:number[]
    ){}
}
```

### Generic
Generic can be defined with some extra information like example below

```typescript 
@decorate({})
class MyAwesomeClass {

    @reflect.type(Number, "Promise")
    getAwesome():Promise<number> {
        
    }
}
```


## Reflect With Decorator Information
Use predefined decorator `decorate`, `decorateClass`, `decorateMethod`, `decorateProperty`, `decorateParameter` to add 
decorator information that understand by `reflect`

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
class MyAwesomeClass extends BaseClass{
    @decorate({})
    myOtherMethod(stringPar:string): number { return 1 }
}

const metadata = reflect(MyAwesomeClass)

/*
metadata: 
{
    kind: "Class",
    name: "MyAwesomeClass",
    ...
    
    methods: [{
        kind: "Method",
        name: "myAwesomeMethod",
        ...
    },{
        kind: "Method",
        name: "myOtherMethod",
        ...
    }]
}
*/
```


## Hook Decorator Creation
All Predefined decorators receives two type of argument, an object or a callback to hook function on decorator creation.

```typescript
decorateParameter(callback: ((target: Class, name: string, index: number) => object))
decorateMethod(callback: ((target: Class, name: string) => object))
decorateProperty(callback: ((target: Class, name: string, index?: any) => object))
decorateClass(callback: ((target: Class) => object))
```

Using callback you can get more information about applied object.

<!-- ## Ignore Member From Metadata Generated

## Reflect Array Element Type

## Reflect Generic Type

## Custom Decorator 

## Merge Decorators -->

## Caveat

1. tinpector uses regex to extract parameter name on constructor, function and methods. Some ES6 parameter feature still not supported.
   * Destructuring parameter
   * Complex default parameter (not tested)

2. Decorator is not inherited by design due to TypeScript behavior that use decorator to provide type information, which in some case will force duplication. Except on inherited method/properties that is not overridden in the child class. Example