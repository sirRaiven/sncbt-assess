import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  useAssessmentDelivery,
} from "~/composables/useAssessmentDelivery";

let functionInvokeMock:
  ReturnType<typeof vi.fn>;

describe("useAssessmentDelivery save-answer contract", () => {
  beforeEach(() => {
    // Keep Nuxt's real Supabase client so application plugins can initialize
    // normally. SupabaseClient exposes `functions` through a getter. Spying
    // on one `supabase.functions.invoke` instance does not intercept the next
    // getter access made inside useAssessmentDelivery().
    //
    // Intercept the getter itself and return a FunctionsClient-compatible
    // object whose invoke method is controlled by this test.
    const supabase =
      useSupabaseClient();

    const functionsClient =
      supabase.functions;

    functionInvokeMock =
      vi.fn()
        .mockResolvedValue({
          data: {
            message:
              "saved",
            saved:
              true,
            timedOut:
              false,
            finalized:
              false,
            nextQuestionIndex:
              0,
            answeredCount:
              1,
          },
          error:
            null,
        });

    vi.spyOn(
      supabase,
      "functions",
      "get",
    ).mockReturnValue({
      ...functionsClient,
      invoke:
        functionInvokeMock,
    } as typeof functionsClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps a normal answer change as a draft", async () => {
    const {
      saveAnswer,
    } =
      useAssessmentDelivery();

    const result =
      await saveAnswer(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        {
          selectedOptionIds: [
            "33333333-3333-4333-8333-333333333333",
          ],
          textResponse:
            null,
          booleanResponse:
            null,
        },
        false,
        false,
      );

    expect(
      result.error,
    ).toBeNull();

    expect(
      functionInvokeMock,
    ).toHaveBeenCalledTimes(
      1,
    );

    const [
      functionName,
      options,
    ] =
      functionInvokeMock
        .mock.calls[0] as [
          string,
          {
            body: {
              action: string;
              payload:
                Record<
                  string,
                  unknown
                >;
            };
            signal?:
              AbortSignal;
          },
        ];

    expect(
      functionName,
    ).toBe(
      "assessment-delivery",
    );

    expect(
      options.body,
    ).toEqual({
      action:
        "save-answer",
      payload: {
        attemptId:
          "11111111-1111-4111-8111-111111111111",
        questionId:
          "22222222-2222-4222-8222-222222222222",
        selectedOptionIds: [
          "33333333-3333-4333-8333-333333333333",
        ],
        textResponse:
          null,
        booleanResponse:
          null,
        finalize:
          false,
        commitForFeedback:
          false,
      },
    });

    expect(
      options.signal,
    ).toBeDefined();
  });

  it("uses explicit finalization for Check Answer", async () => {
    const {
      saveAnswer,
    } =
      useAssessmentDelivery();

    const result =
      await saveAnswer(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        {
          selectedOptionIds:
            [],
          textResponse:
            null,
          booleanResponse:
            true,
        },
        true,
        true,
      );

    expect(
      result.error,
    ).toBeNull();

    expect(
      functionInvokeMock,
    ).toHaveBeenCalledTimes(
      1,
    );

    const [
      functionName,
      options,
    ] =
      functionInvokeMock
        .mock.calls[0] as [
          string,
          {
            body: {
              action: string;
              payload:
                Record<
                  string,
                  unknown
                >;
            };
          },
        ];

    expect(
      functionName,
    ).toBe(
      "assessment-delivery",
    );

    expect(
      options.body.action,
    ).toBe(
      "save-answer",
    );

    expect(
      options.body.payload,
    ).toMatchObject({
      attemptId:
        "11111111-1111-4111-8111-111111111111",
      questionId:
        "22222222-2222-4222-8222-222222222222",
      selectedOptionIds:
        [],
      textResponse:
        null,
      booleanResponse:
        true,
      finalize:
        true,
      commitForFeedback:
        true,
    });
  });
});
