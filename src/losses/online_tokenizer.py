import torch
import torch.nn as nn
import torch.nn.functional as F


class OnlineTokenizerLoss(nn.Module):
    """
    Online Tokenizer self-distillation loss.

    The student receives masked inputs.

    The teacher receives the corresponding
    unmasked inputs.

    Only masked tokens contribute to the loss.

    Based on the practical implementation released
    by the authors of the MOD paper.
    """

    def __init__(
        self,
        patch_ratio=1.0,
    ):
        super().__init__()

        self.patch_ratio = patch_ratio

    def forward(
        self,
        student_tokens,
        teacher_tokens,
        mask,
    ):
        """
        student_tokens:
            [B, N, C]

        teacher_tokens:
            [B, N, C]

        mask:
            [B, N]
            True = masked
        """

        if (
            student_tokens.shape
            != teacher_tokens.shape
        ):
            raise ValueError(
                "Student and teacher token shapes "
                "must match. "
                f"Student: {student_tokens.shape}, "
                f"Teacher: {teacher_tokens.shape}"
            )

        if (
            mask.shape[:2]
            != student_tokens.shape[:2]
        ):
            raise ValueError(
                "Mask does not match token shape. "
                f"Mask: {mask.shape}, "
                f"Tokens: {student_tokens.shape}"
            )

        # Normalize token vectors.
        student = F.normalize(
            student_tokens,
            dim=-1,
        )

        teacher = F.normalize(
            teacher_tokens.detach(),
            dim=-1,
        )

        # Cosine similarity for every token.
        similarity = (
            student * teacher
        ).sum(dim=-1)

        # Only masked tokens contribute.
        masked_similarity = similarity[
            mask
        ]

        if masked_similarity.numel() == 0:

            return student_tokens.new_tensor(
                0.0,
                requires_grad=True,
            )

        loss = (
            1.0 - masked_similarity
        ).mean()

        return loss * self.patch_ratio