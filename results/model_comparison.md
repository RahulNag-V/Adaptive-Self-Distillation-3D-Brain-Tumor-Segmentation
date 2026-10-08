# Model Performance Comparison

| Model | Mean Dice | WT Dice | TC Dice | ET Dice | Mean HD95 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Baseline UNETR** | 0.6887 | 0.6276 | 0.7423 | 0.6961 | 102.66 |
| **Online Tokenizer** | 0.6600 | 0.5843 | 0.7077 | 0.6880 | 116.51 |
| **Dense Predictor** | 0.6078 | 0.4814 | 0.6714 | 0.6705 | 81.64 |
| **Full MOD (Equal Weights)** | 0.5786 | 0.4287 | 0.6635 | 0.6437 | 88.62 |
| **Adaptive MOD** | 0.6212 | 0.5139 | 0.6690 | 0.6808 | 80.4477 |

*Evaluated under identical validation protocol (10 subjects, ROI 96^3, overlap 0.25).*
