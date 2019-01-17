import reflect from "../src";


describe("Private Decorator", () => {
    it("Should be able to ignore get set", () => {
        class DummyClass {
            @reflect.private()
            get data() { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should be able to ignore method", () => {
        class DummyClass {
            @reflect.private()
            data() { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should be able to ignore parameter properties", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(public data:string, @reflect.private() public id:string){}
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })
})