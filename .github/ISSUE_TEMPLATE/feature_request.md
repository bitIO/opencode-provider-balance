---
name: Feature request
description: Suggest an enhancement for the plugin
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem statement
      description: What problem does this solve, and for whom?
      placeholder: A clear and concise description of the problem
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: What should the plugin do differently?
      placeholder: A clear and concise description of your proposed solution
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
      description: What else did you consider, and why is it not enough?
      placeholder: Any alternative solutions or workarounds you considered
  - type: textarea
    id: context
    attributes:
      label: Additional context
      description: Anything else — mockups, links, use cases
      placeholder: Add any other context or screenshots
---
