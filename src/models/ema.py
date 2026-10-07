import torch


@torch.no_grad()
def update_ema(
    student,
    teacher,
    momentum=0.996,
):
    """
    Update teacher parameters using EMA.

    teacher =
        momentum * teacher
        +
        (1 - momentum) * student
    """

    student_state = student.state_dict()
    teacher_state = teacher.state_dict()

    for key in teacher_state:

        teacher_state[key].mul_(
            momentum
        ).add_(
            student_state[key].detach(),
            alpha=1.0 - momentum,
        )