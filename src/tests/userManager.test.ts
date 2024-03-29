import request from 'supertest'
import config from "../config"
import { UserSchema } from '../interfaces'
const { TECH_TOKEN, KIOSK_TOKEN, INVENTORY_TOKEN, ADMIN_TOKEN } = config
const USER_ID = "634e3e4a6c5d3490babcdc21"
const EXAMPLE_USER = {
    first_name: "Test",
    last_name: "User",
    email: "test123@email.com",
    password: "password",
}
const EXAMPLE_USER2 = {
    first_name: "User",
    last_name: "Test",
    email: "321test@email.com",
    password: "wordpass",
}


describe("Register, login, and delete user", () => {
    it("Register a new account, log in, and delete the account", async () => {
        let register = await request("localhost:4001")
            .post("/api/register")
            .send(EXAMPLE_USER)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
        expect(register.statusCode).toBe(200)
        let user_id = register.body._id
        let incorrectLogin = await request("localhost:4001")
            .post("/api/register")
            .send({email: EXAMPLE_USER.email, password: "wrongpassword"})
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
        expect(incorrectLogin.statusCode).toBe(400)
        let loginDisabled = await request("localhost:4001")
            .post("/api/login")
            .send({email: EXAMPLE_USER.email, password: EXAMPLE_USER.password})
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
        expect(loginDisabled.statusCode).toBe(400);
        let testUser = JSON.parse(JSON.stringify(EXAMPLE_USER)) as UserSchema
        testUser.enabled = true
        testUser._id = user_id
        let enableUser = await request("localhost:4001")
            .put("/api/user")
            .send({user: testUser})
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set("Authorization", ADMIN_TOKEN!)
        expect(enableUser.statusCode).toBe(200);
        await new Promise(res => setTimeout(res, 500))
        let login = await request("localhost:4001")
            .post("/api/login")
            .send({email: EXAMPLE_USER.email, password: EXAMPLE_USER.password})
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
        expect(login.statusCode).toBe(200);
        let deleteUser = await request("localhost:4001")
            .delete(`/api/user?id=${user_id}`)
            .set("Authorization", ADMIN_TOKEN!)
        expect(deleteUser.statusCode).toBe(200);
        })
    it("Register with incomplete info results in 400 status", async () => {
        let register = await request("localhost:4001")
            .post("/api/register")
            .send({email: EXAMPLE_USER.email, password: EXAMPLE_USER.password})
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
        expect(register.statusCode).toBe(400)
    })
    it("Existing email address results in 409 status",async () => {
        let register = await request("localhost:4001")
            .post("/api/register")
            .send({
                email: "mike@webnx.com",
                password: EXAMPLE_USER.password,
                first_name: "Mike",
                last_name: "McKay"
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
        expect(register.statusCode).toBe(409)
    })
})

describe("Get user", () => {
    it("Use token to get current user - Tech", async () => {
        let res = await request("localhost:4001")
            .get("/api/user")
            .set("Authorization", TECH_TOKEN!)
        expect(res.body._id).toBeDefined()
    })
    it("Get user by ID - Tech", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user?id=${USER_ID}`)
            .set("Authorization", TECH_TOKEN!)
        expect(res.body._id).toBeDefined()
    })
    it("Use token to get current user - Clerk", async () => {
        let res = await request("localhost:4001")
            .get("/api/user")
            .set("Authorization", INVENTORY_TOKEN!)
        expect(res.body._id).toBeDefined()
    })
    it("Get user by ID - Clerk", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user?id=${USER_ID}`)
            .set("Authorization", INVENTORY_TOKEN!)
        expect(res.body._id).toBeDefined()
    })
    it("Use token to get current user - Kiosk", async () => {
        let res = await request("localhost:4001")
            .get("/api/user")
            .set("Authorization", KIOSK_TOKEN!)
        expect(res.body._id).toBeDefined()
    })
    it("Get user by ID - Kiosk", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user?id=${USER_ID}`)
            .set("Authorization", KIOSK_TOKEN!)
        expect(res.body._id).toBeDefined()
    })
    it("Use token to get current user - Admin", async () => {
        let res = await request("localhost:4001")
            .get("/api/user")
            .set("Authorization", ADMIN_TOKEN!)
        expect(res.body._id).toBeDefined()
    })
    it("Get user by ID - Admin", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user?id=${USER_ID}`)
            .set("Authorization", ADMIN_TOKEN!)
        expect(res.body._id).toBeDefined()
    })
})

describe("Get user inventory", () => {
    it("Tech can get another users inventory", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user/inventory?user_id=${USER_ID}`)
            .set("Authorization", TECH_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
    it("Clerk can get other users inventory", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user/inventory?user_id=${USER_ID}`)
            .set("Authorization", INVENTORY_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
    it("Kiosk can get other users inventory", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user/inventory?user_id=${USER_ID}`)
            .set("Authorization", KIOSK_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
    it("Admin can get other users inventory", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user/inventory?user_id=${USER_ID}`)
            .set("Authorization", ADMIN_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
    it("Tech can get its own inventory", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user/inventory`)
            .set("Authorization", ADMIN_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
    it("Clerk can get its own inventory", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user/inventory`)
            .set("Authorization", INVENTORY_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
    it("Kiosk can get its own inventory", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user/inventory`)
            .set("Authorization", KIOSK_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
    it("Admin can get its own inventory", async () => {
        let res = await request("localhost:4001")
            .get(`/api/user/inventory`)
            .set("Authorization", ADMIN_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
})

describe("Get all users", () => {
    it("Tech can get all users",async () => {
        let res = await request("localhost:4001")
            .get("/api/user/all")
            .set("Authorization", TECH_TOKEN!)
        expect(res.statusCode).toBe(200)
    })
    it("Clerk can get all users", async () => {
        let res = await request("localhost:4001")
            .get("/api/user/all")
            .set("Authorization", INVENTORY_TOKEN!)
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
    })
    it("Kiosk can get all users", async () => {
        let res = await request("localhost:4001")
            .get("/api/user/all")
            .set("Authorization", KIOSK_TOKEN!)
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
    })
    it("Admin can get all users", async () => {
        let res = await request("localhost:4001")
            .get("/api/user/all")
            .set("Authorization", ADMIN_TOKEN!)
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
    })
})

describe("Update user", () => {
    let tempUser = JSON.parse(JSON.stringify(EXAMPLE_USER2))
    tempUser._id = USER_ID
    
    it("Tech cannot update user",async () => {
        let res = await request("localhost:4001")
            .put("/api/user")
            .send({user: tempUser})
            .set("Authorization", TECH_TOKEN!)
        expect(res.statusCode).toBe(403)
    })
    it("Clerk cannot update user",async () => {
        let res = await request("localhost:4001")
            .put("/api/user")
            .send({user: tempUser})
            .set("Authorization", INVENTORY_TOKEN!)
        expect(res.statusCode).toBe(403)
    })
    it("Kiosk cannot update user",async () => {
        let res = await request("localhost:4001")
            .put("/api/user")
            .send({user: tempUser})
            .set("Authorization", KIOSK_TOKEN!)
        expect(res.statusCode).toBe(403)
    })
    it("Admin can update user", async () => {
        let { body: user, statusCode} = await request("localhost:4001")
            .get(`/api/user?id=${USER_ID}`)
            .set("Authorization", ADMIN_TOKEN!)
        expect(statusCode).toBe(200)
        let update1 = await request("localhost:4001")
            .put('/api/user')
            .send({user: tempUser})
            .set("Authorization", ADMIN_TOKEN!)
        expect(update1.statusCode).toBe(200)
        let { body: user2, statusCode: statusCode2} = await request("localhost:4001")
            .get(`/api/user?id=${USER_ID}`)
            .set("Authorization", ADMIN_TOKEN!)
        expect(statusCode2).toBe(200)
        await new Promise(res => setTimeout(res, 500))
        expect(user.email==user2.email).toBe(false)
        let update2 = await request("localhost:4001")
            .put('/api/user')
            .send({user})
            .set("Authorization", ADMIN_TOKEN!)
        expect(update2.statusCode).toBe(200)
        await new Promise(res => setTimeout(res, 500))
        let { body: user3, statusCode: statusCode3} = await request("localhost:4001")
            .get(`/api/user?id=${USER_ID}`)
            .set("Authorization", ADMIN_TOKEN!)
        expect(statusCode3).toBe(200)
        expect(user3.email==user.email).toBe(true)
    })
})

describe("Delete user", () => {
    it("Tech cannot delete user", async () => {
        let deleteUser = await request("localhost:4001")
            .delete(`/api/user?id=${USER_ID}`)
            .set("Authorization", TECH_TOKEN!)
        expect(deleteUser.statusCode).toBe(403);
    })
    it("Clerk cannot delete user", async () => {
        let deleteUser = await request("localhost:4001")
            .delete(`/api/user?id=${USER_ID}`)
            .set("Authorization", INVENTORY_TOKEN!)
        expect(deleteUser.statusCode).toBe(403);
    })
    it("Kiosk cannot delete user", async () => {
        let deleteUser = await request("localhost:4001")
            .delete(`/api/user?id=${USER_ID}`)
            .set("Authorization", KIOSK_TOKEN!)
        expect(deleteUser.statusCode).toBe(403);
    })
})
