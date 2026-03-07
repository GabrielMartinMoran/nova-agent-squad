.PHONY: install uninstall validate help check-deps

# Default target
help:
	@echo "Neocortex Strike Team - Makefile"
	@echo ""
	@echo "Available commands:"
	@echo "  make install     - Install agents to global OpenCode config"
	@echo "  make uninstall   - Remove agents from global OpenCode config"
	@echo "  make validate   - Validate agent file structure"
	@echo "  make check-deps - Check OpenCode installation"
	@echo "  make help       - Show this help message"
	@echo ""

check-deps:
	@echo "Checking OpenCode installation..."
	@which opencode > /dev/null 2>&1 && echo "✓ OpenCode is installed" || (echo "✗ OpenCode not found" && exit 1)

install: check-deps
	@echo "Installing Neocortex Strike Team agents..."
	@mkdir -p ~/.config/opencode/agents
	@cp -f .opencode/agents/* ~/.config/opencode/agents/
	@echo "✓ Agents installed to ~/.config/opencode/agents/"
	@echo ""
	@echo "To verify, restart OpenCode and check agent list."
	@echo "The default agent should be 'Neocortex Strike Team'."

uninstall:
	@echo "Uninstalling Neocortex Strike Team agents..."
	@rm -f ~/.config/opencode/agents/"Neocortex Strike Team.md"
	@rm -f ~/.config/opencode/agents/nst_researcher.md
	@rm -f ~/.config/opencode/agents/nst_developer.md
	@rm -f ~/.config/opencode/agents/nst_qa.md
	@echo "✓ Agents removed from ~/.config/opencode/agents/"
	@echo ""
	@echo "Note: This removes only the agent files."
	@echo "To reset default_agent, edit ~/.config/opencode/opencode.json"

validate: check-deps
	@echo "Validating agent structure..."
	@# Check all required agent files exist
	@for agent in "Neocortex Strike Team" nst_researcher nst_developer nst_qa; do \
		if [ -f ".opencode/agents/$$agent.md" ]; then \
			echo "✓ $$agent.md"; \
		else \
			echo "✗ $$agent.md missing"; \
			exit 1; \
		fi; \
	done
	@echo ""
	@# Validate YAML frontmatter (basic check)
	@for file in .opencode/agents/*.md; do \
		if ! head -20 "$$file" | grep -q "^---"; then \
			echo "✗ $$file missing frontmatter"; \
			exit 1; \
		fi; \
	done
	@echo "✓ All agent files have valid structure"
	@echo ""
	@echo "Validation complete!"
