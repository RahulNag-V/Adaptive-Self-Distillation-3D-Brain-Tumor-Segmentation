import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

class BrainTumorClassifier(nn.Module):
    def __init__(self, num_classes=4, pretrained=True, dropout=0.2):
        super().__init__()
        weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
        self.backbone = efficientnet_b0(weights=weights)
        in_features = self.backbone.classifier[1].in_features  # 1280
        
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=dropout, inplace=True),
            nn.Linear(in_features, num_classes)
        )
        self.num_classes = num_classes

    def forward(self, x):
        return self.backbone(x)

def build_model(num_classes=4, pretrained=True, dropout=0.2):
    return BrainTumorClassifier(num_classes=num_classes, pretrained=pretrained, dropout=dropout)
