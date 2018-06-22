import { reflect, ObjectReflection } from "../src/reflect";
import * as Path from "path"

describe("Reflect", () => {
    it("Should have object root", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result).toMatchObject({
            type: 'Object',
            name: 'module',
        })
    })
    it("Should reflect function with parameter", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[0]).toMatchObject({
            type: 'Function',
            name: 'myFun',
            decorators: [],
            parameters:
                [{ type: 'Parameter', decorators: [], name: 'firstPar' },
                { type: 'Parameter', decorators: [], name: 'secondPar' }]
        })
    })
    it("Should reflect function without parameter", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[1]).toMatchObject({ type: 'Function', decorators: [], name: 'myOtherFun', parameters: [] })
    })
    it("Should reflect class", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[2]).toMatchObject({
            decorators: [],
            type: 'Class',
            name: 'MyClass',
            methods:
                [{
                    type: 'Function',
                    name: 'myMethod',
                    decorators: [],
                    parameters:
                        [{ type: 'Parameter', name: 'firstPar', decorators: [], },
                        { type: 'Parameter', name: 'secondPar', decorators: [], }]
                },
                { type: 'Function', name: 'myOtherMethod', parameters: [], decorators: [], }]
        })
    })
    it("Should reflect decorated class", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[3]).toMatchObject({
            type: 'Class',
            name: 'AnimalClass',
            methods:
                [{
                    type: 'Function',
                    name: 'myMethod',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'firstPar',
                            decorators:
                                [{ required: true }]
                        },
                        {
                            type: 'Parameter',
                            name: 'secondPar',
                            decorators:
                                [{ required: false }]
                        }],
                    decorators:
                        [{ url: '/get' }]
                },
                {
                    type: 'Function',
                    name: 'myOtherMethod',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'par1',
                            decorators:
                                [{ required: true }]
                        },
                        { type: 'Parameter', name: 'par2', decorators: [] }],
                    decorators: []
                }],
            decorators:
                [{ url: '/animal' }]
        })
    })
    it("Should reflect namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[4]).toMatchObject({
            type: 'Object',
            name: 'myNamespace'
        })
    })

    it("Should reflect function inside namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect((<ObjectReflection>result.members[4]).members[0]).toMatchObject({
            type: 'Function',
            name: 'myFunInsideNamespace',
            decorators: [],
            parameters:
                [{ type: 'Parameter', decorators: [], name: 'firstPar' },
                { type: 'Parameter', decorators: [], name: 'secondPar' }]
        })
    })

    it("Should reflect function without parameter inside namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect((<ObjectReflection>result.members[4]).members[1]).toMatchObject({
            type: 'Function',
            name: 'myOtherFunInsideNamespace',
            decorators: [],
            parameters: []
        })
    })

    it("Should reflect class inside namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect((<ObjectReflection>result.members[4]).members[2]).toMatchObject({
            decorators: [],
            type: 'Class',
            name: 'MyClassInsideNamespace',
            methods:
                [{
                    type: 'Function',
                    name: 'myMethod',
                    decorators: [],
                    parameters:
                        [{ type: 'Parameter', decorators: [], name: 'firstPar' },
                        { type: 'Parameter', decorators: [], name: 'secondPar' }]
                },
                { type: 'Function', decorators: [], name: 'myOtherMethod', parameters: [] }]
        })
    })

    it("Should reflect decorated class inside namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect((<ObjectReflection>result.members[4]).members[3]).toMatchObject({
            type: 'Class',
            name: 'AnimalClass',
            methods:
                [{
                    type: 'Function',
                    name: 'myMethod',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'firstPar',
                            decorators: [{ required: true }]
                        },
                        {
                            type: 'Parameter',
                            name: 'secondPar',
                            decorators: [{ required: false }]
                        }],
                    decorators: [{ url: '/get' }]
                },
                {
                    type: 'Function',
                    name: 'myOtherMethod',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'par1',
                            decorators:
                                [{ required: true }]
                        },
                        { type: 'Parameter', name: 'par2', decorators: [] }],
                    decorators: []
                }],
            decorators: [{ url: '/animal' }]
        })
    })

    it("Should able to reflect global module", async () => {
        const result = await reflect("jest")
        expect(result.type).toEqual("Object")
        expect(result.members!.length).toBeGreaterThan(0)
    })
})
