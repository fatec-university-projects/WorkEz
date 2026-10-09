CREATE TABLE IF NOT EXISTS "ChatMessages" (
    "Id" uuid NOT NULL,
    "ProposalId" uuid NULL,
    "ServiceId" uuid NULL,
    "SenderId" uuid NOT NULL,
    "Content" character varying(2000) NOT NULL,
    "IsFromProvider" boolean NOT NULL,
    "SentAt" timestamp with time zone NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_ChatMessages" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ChatMessages_Proposals_ProposalId" FOREIGN KEY ("ProposalId") REFERENCES "Proposals" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ChatMessages_Services_ServiceId" FOREIGN KEY ("ServiceId") REFERENCES "Services" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_ChatMessages_ProposalId" ON "ChatMessages" ("ProposalId");
CREATE INDEX IF NOT EXISTS "IX_ChatMessages_ServiceId" ON "ChatMessages" ("ServiceId");
