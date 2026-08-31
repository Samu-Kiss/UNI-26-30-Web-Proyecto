package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.sentry.Sentry;
import io.sentry.protocol.SentryId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "SENTRY_VERIFY", matches = "true")
class SentryVerificationTest {

    @Test
    void sendsIntentionalException() {
        assertTrue(Sentry.isEnabled(), "Sentry SDK must be enabled for verification");

        SentryId eventId = SentryId.EMPTY_ID;
        try {
            throw new Exception("This is a test.");
        } catch (Exception exception) {
            eventId = Sentry.captureException(exception);
        }

        Sentry.flush(10_000);

        assertNotEquals(SentryId.EMPTY_ID, eventId);
        System.out.println("Sentry verification event ID: " + eventId);
    }

}
