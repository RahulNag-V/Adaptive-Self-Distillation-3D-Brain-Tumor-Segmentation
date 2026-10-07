import os
from pathlib import Path

import torch
from torch.amp import GradScaler, autocast
from tqdm import tqdm


class Trainer:
    def __init__(
        self,
        model,
        train_loader,
        val_loader,
        optimizer,
        loss_function,
        device="cuda",
        output_dir="checkpoints/baseline",
        accumulation_steps=1,
    ):
        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.optimizer = optimizer
        self.loss_function = loss_function
        self.device = torch.device(device)

        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.accumulation_steps = accumulation_steps

        self.use_amp = self.device.type == "cuda"

        self.scaler = GradScaler(
            "cuda",
            enabled=self.use_amp
        )

        self.model.to(self.device)

    def train_one_epoch(self, epoch):
        self.model.train()

        running_loss = 0.0

        self.optimizer.zero_grad(set_to_none=True)

        progress = tqdm(
            self.train_loader,
            desc=f"Epoch {epoch} [Train]"
        )

        for step, batch in enumerate(progress):

            images = batch["image"].to(
                self.device,
                non_blocking=True
            )

            labels = batch["label"].to(
                self.device,
                non_blocking=True
            )

            with autocast(
                device_type=self.device.type,
                dtype=torch.float16,
                enabled=self.use_amp,
            ):
                outputs = self.model(images)

                loss = self.loss_function(
                    outputs,
                    labels
                )

                loss = loss / self.accumulation_steps

            self.scaler.scale(loss).backward()

            if (
                (step + 1) % self.accumulation_steps == 0
                or (step + 1) == len(self.train_loader)
            ):
                self.scaler.step(self.optimizer)
                self.scaler.update()

                self.optimizer.zero_grad(set_to_none=True)

            running_loss += loss.item() * self.accumulation_steps

            progress.set_postfix(
                loss=f"{loss.item() * self.accumulation_steps:.4f}"
            )

        return running_loss / len(self.train_loader)

    @torch.no_grad()
    def validate_one_epoch(self, epoch):
        self.model.eval()

        running_loss = 0.0

        progress = tqdm(
            self.val_loader,
            desc=f"Epoch {epoch} [Val]"
        )

        for batch in progress:

            images = batch["image"].to(
                self.device,
                non_blocking=True
            )

            labels = batch["label"].to(
                self.device,
                non_blocking=True
            )

            with autocast(
                device_type=self.device.type,
                dtype=torch.float16,
                enabled=self.use_amp,
            ):
                outputs = self.model(images)

                loss = self.loss_function(
                    outputs,
                    labels
                )

            running_loss += loss.item()

            progress.set_postfix(
                loss=f"{loss.item():.4f}"
            )

        return running_loss / len(self.val_loader)

    def save_checkpoint(
        self,
        epoch,
        train_loss,
        val_loss,
        filename="latest.pth",
    ):
        checkpoint_path = self.output_dir / filename

        torch.save(
            {
                "epoch": epoch,
                "model_state_dict": self.model.state_dict(),
                "optimizer_state_dict": self.optimizer.state_dict(),
                "train_loss": train_loss,
                "val_loss": val_loss,
            },
            checkpoint_path,
        )

        return checkpoint_path