# Verification provider evaluation

Reviewed: 2026-11-19  
Constraint: no paid production service or additional recurring cost without an explicit budget decision.

## Current state

Verity's Gemini media route is a general multimodal inspection aid. It deliberately records uncertainty and does not claim forensic AI-generation, manipulation or deepfake detection. The news RSS endpoint is source discovery only. The optional Google Fact Check Tools route searches third-party reviews already published by participating fact-check publishers; it does not assess new claims itself.

## Candidate: Sightengine

Official references:
- AI-generated image detection: https://sightengine.com/docs/ai-generated-image-detection
- Free plan FAQ: https://www.sightengine.com/faq/do-you-offer-a-free-trial

What it offers:
- A dedicated pixel-based image model for AI-generated and AI-edited content.
- Separate deepfake detection and AI-video detection models.
- A documented API response with an `ai_generated` score and operation usage.

Constraint:
- The free plan is for testing/personal use and has volume/concurrency limits.
- The provider's FAQ says video moderation and several other capabilities are only available on paid plans.
- Therefore the free tier is not a valid basis for enabling public production image/video detection on Verity.

Decision: do not enable as a production provider under the current no-cost constraint. It may be evaluated manually with non-sensitive sample media only after account terms and data handling are reviewed.

## Candidate: open-source image models

Examples reviewed:
- Detectra v1, MIT licence and browser-oriented ONNX/WebGPU/WASM packaging: https://huggingface.co/TensorFold/detectra-v1
- Smaug AI Image Detector, Apache 2.0 model card, approximately 439M parameters: https://huggingface.co/abacusai/Smaug-AI-Image-Detector

Advantages:
- Potentially self-hosted without per-request API fees.
- A browser-oriented ONNX model could avoid sending an image to a third-party provider.

Constraints:
- Model hosting, download size, inference performance, browser memory and mobile support still have costs.
- Model-card claims are not an independent benchmark for Verity's own media mix.
- Image detectors do not automatically solve video deepfake detection.
- Model accuracy can degrade on screenshots, crops, compression, new generators and non-photographic content.

Decision: investigate an on-device prototype only after building a representative, consented evaluation set. Keep its output advisory and uncertain. Do not add a fake confidence score or convert one detector score into an automatic moderation verdict.

## Required evaluation before production

1. Confirm licence and redistribution rights for the exact model weights and preprocessing code.
2. Build a consented test set spanning real photographs, AI-generated images, AI-edited images, screenshots, memes, illustrations, compression and common social-media re-encodes.
3. Measure false-positive rate and false-negative rate separately; report results by media category and source model.
4. Test current mobile browsers, low-memory devices, latency and model download size.
5. Compare with human review and preserve an uncertainty/appeal path.
6. For video, evaluate frame sampling, temporal consistency and audio/video synchronization separately; do not extrapolate image model performance to video.
7. Confirm no sensitive uploads are sent to an external provider without explicit, specific consent.

## Release decision

No dedicated forensic provider is enabled. The Trust Center must continue to say that AI generation and deepfake detection are not available until a suitable provider or tested on-device model is actually connected. A paid-only video feature must remain disabled under the current budget constraint.
