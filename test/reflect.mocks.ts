export function myFun(firstPar: string, secondPar: string) { }
export function myOtherFun() { }

export class MyClass {
    myMethod(firstPar: string, secondPar: string) { }
    myOtherMethod(){}
}

export namespace myNamespace {
    export function myFunInsideNamespace(firstPar: string, secondPar: string) { }
    export function myOtherFunInsideNamespace() { }
    export class MyClassInsideNamespace {
        myMethod(firstPar: string, secondPar: string) { }
        myOtherMethod(){}
    }
}