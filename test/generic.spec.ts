import reflect, { generic, type, parameterProperties } from "../src"

describe("Generic", () => {
    it("Should able to inspect generic type on method", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on method parameter", () => {
        @generic.template("T")
        class SuperClass<T> {
            method(@type("T") par: T) { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on property", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            prop: T = {} as any
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on getter", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            get prop(): T { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on parameter properties", () => {
        @generic.template("T")
        @parameterProperties()
        class SuperClass<T> {
            constructor(@type("T") public prop:T) {}
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on constructor parameters", () => {
        @generic.template("T")
        class SuperClass<T> {
            constructor(@type("T") par:T){}
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
})