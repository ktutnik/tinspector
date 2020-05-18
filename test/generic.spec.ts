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
            constructor(@type("T") public prop: T) { }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on constructor parameters", () => {
        @generic.template("T")
        class SuperClass<T> {
            constructor(@type("T") par: T) { }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should not error inspect the generic class", () => {
        @generic.template("T")
        class SuperClass<T> {
            constructor(@type("T") par: T) { }
        }
        expect(reflect(SuperClass)).toMatchSnapshot()
    })
    it("Should able to inspect nested generic class with multiple templates", () => {
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            str(@type("U") bool: U): T { return {} as any }
        }
        @generic.template("T", "U")
        @generic.type(String, Boolean)
        class SuperClass<T, U> extends GrandSuperClass<string, Boolean>{
            @type("T")
            num(@type("U") date: U): T { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
})

describe("Create Generic", () => {
    it("Should able to create generic class implementation", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            method():T { return {} as any}
        }
        const ChildClass = generic.create(SuperClass, Number)
        const instance = new ChildClass()
        expect(instance).toBeInstanceOf(SuperClass)
        expect(instance).toBeInstanceOf(ChildClass)
    })
    it("Should add reflection properly", () => {
        @generic.template("T", "U")
        class SuperClass<T, U> {
            @type("T")
            method(@type("U") par:U):T { return {} as any}
        }
        const ChildClass = generic.create(SuperClass, Number, String)
        const instance = new ChildClass()
        expect(reflect(ChildClass)).toMatchSnapshot()
    })
    it("Should able to create multiple time", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            method():T { return {} as any}
        }
        const ChildClass = generic.create(SuperClass, Number)
        const instance = new ChildClass()
        expect(instance).toBeInstanceOf(SuperClass)
        expect(instance).toBeInstanceOf(ChildClass)
        const OtherClass = generic.create(SuperClass, String)
        const other = new OtherClass()
        expect(other).toBeInstanceOf(SuperClass)
        expect(other).toBeInstanceOf(OtherClass)
    })
    it("Should execute super class controller", () => {
        const fn = jest.fn()
        @generic.template("T")
        class SuperClass<T> {
            constructor(){
                fn()
            }
            @type("T")
            method():T { return {} as any}
        }
        const ChildClass = generic.create(SuperClass, Number)
        const instance = new ChildClass()
        expect(fn).toBeCalledTimes(1)
    })
})