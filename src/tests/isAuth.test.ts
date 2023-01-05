import request from 'supertest'
import config from "../config"
const { TECH_TOKEN, KIOSK_TOKEN, INVENTORY_TOKEN, ADMIN_TOKEN } = config

describe("Is auth module works as expected", () => {
    it("Returns 401 when unauthenticated", async () => {
        const res = await request("localhost:4001")
            .post("/api/auth")
            expect(res.statusCode).toBe(401)
            expect(res.body.user_id).toBeUndefined()
        expect(res.body.email).toBeUndefined()
        expect(res.body.role).toBeUndefined()
        expect(res.body.building).toBeUndefined()
    })
    it("Returns status 200 and simplified user object - Tech", async () => {
        const res = await request("localhost:4001")
            .post("/api/auth")
            .set("Authorization", TECH_TOKEN!)
        console.log(res.body)
        expect(res.statusCode).toBe(200)
        expect(res.body.user_id).toBeDefined()
        expect(res.body.email).toBeDefined()
        expect(res.body.role).toBeDefined()
        expect(res.body.building).toBeDefined()
        expect(res.body.password).toBeUndefined()
    })
    it("Returns status 200 and simplified user object - Kiosk", async () => {
        const res = await request("localhost:4001")
            .post("/api/auth")
            .set("Authorization", KIOSK_TOKEN!)
        expect(res.statusCode).toBe(200)
        expect(res.body.user_id).toBeDefined()
        expect(res.body.email).toBeDefined()
        expect(res.body.role).toBeDefined()
        expect(res.body.building).toBeDefined()
        expect(res.body.password).toBeUndefined()
    })
    it("Returns status 200 and simplified user object - Clerk", async () => {
        const res = await request("localhost:4001")
            .post("/api/auth")
            .set("Authorization", INVENTORY_TOKEN!)
        expect(res.statusCode).toBe(200)
        expect(res.body.user_id).toBeDefined()
        expect(res.body.email).toBeDefined()
        expect(res.body.role).toBeDefined()
        expect(res.body.building).toBeDefined()
        expect(res.body.password).toBeUndefined()
    })
    it("Returns status 200 and simplified user object - Admin", async () => {
        const res = await request("localhost:4001")
            .post("/api/auth")
            .set("Authorization", ADMIN_TOKEN!)
        expect(res.statusCode).toBe(200)
        expect(res.body.user_id).toBeDefined()
        expect(res.body.email).toBeDefined()
        expect(res.body.role).toBeDefined()
        expect(res.body.building).toBeDefined()
        expect(res.body.password).toBeUndefined()
    })
})
