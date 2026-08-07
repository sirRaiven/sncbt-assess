<script setup lang="ts">
defineProps<{
  title: string;
  period?: string | null;
  subtitle?: string | null;
  generatedAt?: string | null;
}>();

function formatGenerated(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
        timeZone:
          "Asia/Manila",
      },
    )
    .format(
      new Date(value),
    );
}
</script>

<template>
  <header class="report-official-header">
    <div class="report-official-brand">
      <img
        src="/images/sncbt-logo.png"
        alt="SNCBT logo"
        class="report-official-logo"
      >

      <div class="report-official-school">
        <p class="report-official-name">
          St. Nicolas College of Business and Technology
        </p>

        <p class="report-official-location">
          City of San Fernando, Pampanga
        </p>

        <p class="report-official-office">
          ASSESSMENT CLASSROOM MANAGEMENT
        </p>
      </div>
    </div>

    <div class="report-official-rule" />

    <div class="report-official-title">
      <h1>
        {{ title }}
      </h1>

      <p v-if="subtitle">
        {{ subtitle }}
      </p>

      <div class="report-official-meta">
        <span v-if="period">
          Reporting period:
          {{ period }}
        </span>

        <span v-if="generatedAt">
          Generated:
          {{
            formatGenerated(
              generatedAt,
            )
          }}
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.report-official-header {
  display: none;
}

@media print {
  .report-official-header {
    display: block;
    margin-bottom: 20px;
    color: #111827;
  }

  .report-official-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }

  .report-official-logo {
    width: 68px;
    height: 68px;
    object-fit: contain;
  }

  .report-official-school {
    text-align: center;
  }

  .report-official-name {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
  }

  .report-official-location,
  .report-official-office {
    margin: 2px 0 0;
    font-size: 10px;
  }

  .report-official-office {
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .report-official-rule {
    margin: 12px 0 14px;
    border-top: 2px solid #111827;
  }

  .report-official-title {
    text-align: center;
  }

  .report-official-title h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .report-official-title p {
    margin: 4px 0 0;
    font-size: 11px;
  }

  .report-official-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px 22px;
    margin-top: 7px;
    font-size: 10px;
  }
}
</style>
