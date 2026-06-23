// effect-kit: export Effect spans/logs/metrics to Maple Local (brew install Makisuo/tap/maple; maple start).
// v4-native exporter - verified against Maple's own source. Uses effect/unstable/observability built-in.
import { Config, Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import { Otlp } from "effect/unstable/observability"

export const MapleObservabilityLive: Layer.Layer<never> = Layer.unwrap(
  Effect.gen(function* () {
    const enabled = yield* Config.boolean("MAPLE_TRACING").pipe(Config.withDefault(false))
    if (!enabled) return Layer.empty // inert by default - zero exporter overhead
    const baseUrl = yield* Config.string("MAPLE_OTLP_URL").pipe(
      Config.withDefault("http://127.0.0.1:4318"))
    const serviceName = yield* Config.string("OTEL_SERVICE_NAME").pipe(
      Config.withDefault("app"))
    return Otlp.layerJson({
      baseUrl,
      resource: { serviceName, attributes: {} },
    }).pipe(Layer.provide(FetchHttpClient.layer))
  }),
)
