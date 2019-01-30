import { getConstructorParameters, getParameterNames, decorate } from "../src";

function globalFunction(a: any, b: any) {

}

describe("Constructor parameter", () => {
    it("Should get constructor parameter name", () => {
        class DummyClass {
            constructor(
                par1: string,
                par2: string,
                par3: string,
                par4: string
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should get constructor parameter name with comment", () => {
        class DummyClass {
            constructor(
                /* this is comment */
                par1: string,
                /* this is comment () */
                par2: string,
                par3: string,
                /* this is comment {} */
                par4: string
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should get constructor with default parameter", () => {
        class DummyClass {
            constructor(
                par1 = "Halo",
                par2 = 123,
                par3 = new Date(),
                par4 = false
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should reflect rest parameter", () => {
        class DummyClass {
            constructor(...pars: any[]) { }
        }
        const result = getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should return empty array when no constructor provided", () => {
        class DummyClass {
            @decorate({})
            myProp = 1;
            @decorate({})
            myFunction(
                @decorate({}) par: string
            ) { }
        }
        const result = getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })


})

describe("Method Parameters", () => {
    it("Should get method parameter name", () => {
        class DummyClass {
            myMethod(
                par1: string,
                par2: string,
                par3: string,
                par4: string
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = getParameterNames(DummyClass.prototype["myMethod"])
        expect(result).toMatchSnapshot()
    })

    it("Should get method parameter name with comment", () => {
        class DummyClass {
            myMethod(
                /* this is comment */
                par1: string,
                /* this is comment () */
                par2: string,
                par3: string,
                /* this is comment {} */
                par4: string
            ) { 
                globalFunction(par1, par2)
            }
        }
        const result = getParameterNames(DummyClass.prototype["myMethod"])
        expect(result).toMatchSnapshot()
    })

    it("Should get method parameter with default parameter", () => {
        class DummyClass {
            myMethod(
                par1 = "Halo",
                par2 = 123,
                par3 = new Date(),
                par4 = false
            ) { 
                globalFunction(par1, par2)
            }
        }
        const result = getParameterNames(DummyClass.prototype["myMethod"])
        expect(result).toMatchSnapshot()
    })
})

describe("Function Parameters", () => {
    it("Should get function parameter name", () => {
        function myFunction(
            par1: string,
            par2: string,
            par3: string,
            par4: string
        ) {
            globalFunction(par1, par2)
        }
        const result = getParameterNames(myFunction)
        expect(result).toMatchSnapshot()
    })

    it("Should get function parameter name with comment", () => {
        function myFunction(
            /* this is comment */
            par1: string,
            /* this is comment () */
            par2: string,
            par3: string,
            /* this is comment {} */
            par4: string
        ) { 
            globalFunction(par1, par2)
        }
        const result = getParameterNames(myFunction)
        expect(result).toMatchSnapshot()
    })

    it("Should get function parameter with default parameter", () => {
        function myFunction(
            par1 = "Halo",
            par2 = 123,
            par3 = new Date(),
            par4 = false
        ) { 
            globalFunction(par1, par2)
        }
        const result = getParameterNames(myFunction)
        expect(result).toMatchSnapshot()
    })
})