import { reflect, getDeepMembers, decorateProperty, DECORATOR_KEY, decorateMethod, parameterProperties } from "../src";

describe("getDeepMember", () => {

    it("Should inspect getter", () => {
        class ChildClass { get data() { return 1 } }
        const members = getDeepMembers(ChildClass)
        expect(members).toMatchObject(["data"])
    })

    it("Should inspect function", () => {
        class ChildClass { myFunction() { } }
        const members = getDeepMembers(ChildClass)
        expect(members).toMatchObject(["myFunction"])
    })

    it("Should inspect property", () => {
        class ChildClass {
            @decorateProperty({})
            myProp = 1
        }
        const members = getDeepMembers(ChildClass)
        expect(members).toMatchObject(["myProp"])
    })

})

describe("Inheritance", () => {
    it("Should get base class properties", () => {
        class BaseClass {
            @decorateProperty({ value: 1 })
            parentProp = 1
        }
        class ChildClass extends BaseClass { }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should get base class getter", () => {
        class BaseClass {
            get parentProp() { return 1 }
        }
        class ChildClass extends BaseClass {
            get childProp() { return 1 }
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should get base class getter with decorator", () => {
        class BaseClass {
            @decorateProperty({ value: 1 })
            get parentProp() { return 1 }
        }
        class ChildClass extends BaseClass {
            get childProp() { return 1 }
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should get base class method", () => {
        class BaseClass {
            myMethod() { }
        }
        class ChildClass extends BaseClass { }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should get base class method with decorator", () => {
        class BaseClass {
            @decorateMethod({ value: 1 })
            myMethod(a: string): string { return "" }
        }
        class ChildClass extends BaseClass { }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect domain with inheritance using constructor property", () => {
        @parameterProperties()
        class DomainBase {
            constructor(
                public id = 0,
                public createdAt = new Date()
            ) { }
        }
        @parameterProperties()
        class Item extends DomainBase {
            constructor(
                public name: string,
                public discontinue: boolean,
                public price: number,
                public type: "Tools" | "Goods"
            ) { super() }
        }
        const meta = reflect(Item)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect domain with inheritance using property", () => {
        @parameterProperties()
        class DomainBase {
            @decorateProperty({})
            id = 0
            @decorateProperty({})
            createdAt = new Date()
        }
        @parameterProperties()
        class Item extends DomainBase {
            constructor(
                public name: string,
                public discontinue: boolean,
                public price: number,
                public type: "Tools" | "Goods"
            ) { super() }
        }
        const meta = reflect(Item)
        expect(meta).toMatchSnapshot()
    })
})
