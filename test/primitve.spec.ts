import reflect from "../src"

describe("Primitive Class", () => {
    it("Should inspect Boolean", () => {
        expect(reflect(Boolean)).toMatchSnapshot()
    })
    it("Should inspect String", () => {
        expect(reflect(String)).toMatchSnapshot()
    })
    it("Should inspect Number", () => {
        expect(reflect(Number)).toMatchSnapshot()
    })
    it("Should inspect Date", () => {
        expect(reflect(Date)).toMatchSnapshot()
    })
    it("Should inspect Array", () => {
        expect(reflect(Array)).toMatchSnapshot()
    })
    it("Should inspect Object", () => {
        expect(reflect(Object)).toMatchSnapshot()
    })
    it("Should inspect Promise", () => {
        expect(reflect(Promise)).toMatchSnapshot()
    })
})