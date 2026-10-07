import torch
import torch.nn as nn


class MODLoss(nn.Module):
    """
    Combined MOD loss:

        L_MOD = lambda_ot * L_OnlineTokenizer
              + lambda_dp * L_DensePredictor

    Paper setting:
        lambda_ot = 1.0
        lambda_dp = 1.0
    """

    def __init__(self, lambda_ot=1.0, lambda_dp=1.0):
        super().__init__()
        self.lambda_ot = lambda_ot
        self.lambda_dp = lambda_dp

    def forward(self, online_tokenizer_loss, dense_predictor_loss):
        mod_loss = (
            self.lambda_ot * online_tokenizer_loss
            + self.lambda_dp * dense_predictor_loss
        )

        return mod_loss