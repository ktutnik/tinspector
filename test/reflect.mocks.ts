import { decorateClass, decorateMethod, decorateParameter } from "../src/reflect";

export function myFun(firstPar: string, secondPar: string) { }
export function myOtherFun() { }

export class MyClass {
    myMethod(firstPar: string, secondPar: string) { }
    myOtherMethod() { }
}

@decorateClass({ url: "/animal" })
export class AnimalClass {
    @decorateMethod({ url: "/get" })
    myMethod(@decorateParameter({ required: true }) firstPar: string, @decorateParameter({ required: false }) secondPar: string) { }
    myOtherMethod(@decorateParameter({ required: true }) par1: string, par2: string) { }
}

export namespace myNamespace {
    export function myFunInsideNamespace(firstPar: string, secondPar: string) { }
    export function myOtherFunInsideNamespace() { }
    export class MyClassInsideNamespace {
        myMethod(firstPar: string, secondPar: string) { }
        myOtherMethod() { }
    }
    @decorateClass({ url: "/animal" })
    export class AnimalClass {
        @decorateMethod({ url: "/get" })
        myMethod(@decorateParameter({ required: true }) firstPar: string, @decorateParameter({ required: false }) secondPar: string) { }
        myOtherMethod(@decorateParameter({ required: true }) par1: string, par2: string) { }
    }
}