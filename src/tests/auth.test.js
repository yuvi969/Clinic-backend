const request =
  require("supertest");

const app =
  require("../app");

describe(
  "Auth API",
  () => {

    test(
      "GET / returns API running",
      async () => {

        const res =
          await request(app)
            .get("/");

        expect(
          res.statusCode
        ).toBe(200);

        expect(
          res.text
        ).toBe(
          "API is running..."
        );

      }
    );

    test(
      "Login fails with wrong credentials",
      async () => {

        const res =
          await request(app)
            .post(
              "/api/auth/login"
            )
            .send({
              email:
                "wrong@test.com",
              password:
                "wrong",
            });

        expect(
          res.statusCode
        ).toBe(400);

      }
    );

    test(
  "Database connection works",
  async () => {

    const pool =
      require("../db");

    const result =
      await pool.query(
        "SELECT NOW()"
      );

    console.log(
      result.rows
    );

    expect(
      result.rows.length
    ).toBe(1);

  },
  10000
);

  }
);