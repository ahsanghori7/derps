import assert from "node:assert/strict";
import test from "node:test";
import {
    getStaffSaveErrorMessage,
    getStaffSaveFieldErrors,
    normalizePayFrequency,
    PAY_FREQUENCY_OPTIONS,
} from "./validation.js";

test("only exposes pay frequencies supported by the backend", () => {
    assert.deepEqual(PAY_FREQUENCY_OPTIONS, [
        { name: "Bi-weekly" },
        { name: "Monthly" },
    ]);
    assert.equal(normalizePayFrequency("Bi-weekly"), "bi-weekly");
    assert.equal(normalizePayFrequency("Monthly"), "monthly");
    assert.equal(normalizePayFrequency("Weekly"), null);
});

test("converts database errors into a safe staff save message", () => {
    const error = new Error(JSON.stringify({
        message: "Data truncated for column 'payFrequency' at row 1",
        stack: "Sequelize stack details",
    }));

    assert.equal(
        getStaffSaveErrorMessage(error),
        "Unable to save staff member. Please verify the payroll information and try again.",
    );
});

test("keeps useful API errors without exposing JSON or stack details", () => {
    const error = new Error(JSON.stringify({
        message: "Email already exists",
        stack: "internal stack details",
    }));

    assert.equal(getStaffSaveErrorMessage(error), "Email already exists");
});

test("prefers field errors over the generic validation message", () => {
    const error = new Error(JSON.stringify({
        message: "Please fix the following errors.",
        errors: { email: "Email must be unique." },
    }));

    assert.equal(getStaffSaveErrorMessage(error), "Email must be unique.");
    assert.deepEqual(getStaffSaveFieldErrors(error), { email: true });
});

test("joins multiple API field errors for the toast", () => {
    const error = new Error(JSON.stringify({
        message: "Please fix the following errors.",
        errors: {
            email: "Email must be unique.",
            username: ["Username is already taken."],
        },
    }));

    assert.equal(
        getStaffSaveErrorMessage(error),
        "Email must be unique., Username is already taken.",
    );
    assert.deepEqual(getStaffSaveFieldErrors(error), {
        email: true,
        username: true,
    });
});

test("reads field errors from error.data when available", () => {
    const error = new Error("Please fix the following errors.");
    error.data = {
        message: "Please fix the following errors.",
        errors: { email: "Email must be unique." },
    };

    assert.equal(getStaffSaveErrorMessage(error), "Email must be unique.");
    assert.deepEqual(getStaffSaveFieldErrors(error), { email: true });
});
