import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import PageHeader from "../../app/components/PageHeader.vue";

describe("PageHeader", () => {
  it("renders its title and description in the Nuxt runtime", async () => {
    const wrapper = await mountSuspended(PageHeader, {
      props: {
        title: "Assessments",
        description: "Manage assessment work.",
      },
    });

    expect(wrapper.text()).toContain("Assessments");
    expect(wrapper.text()).toContain("Manage assessment work.");
  });
});
