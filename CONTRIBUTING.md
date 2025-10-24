# Contributing to Sora Oracle SDK

Thank you for considering contributing to Sora Oracle SDK! This is an open-source, community-driven project.

## 🤝 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](../../issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Node version, Hardhat version)

### Suggesting Features

1. Open an issue with `[Feature Request]` in the title
2. Describe the feature and why it's needed
3. Provide examples of how it would work

### Code Contributions

#### Setup Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/sora-oracle-sdk
cd sora-oracle-sdk

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run tests
npm test
```

#### Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new features
   - Update documentation

3. **Test your changes**
   ```bash
   npm test
   npm run compile
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

#### Commit Message Format

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Examples:
- `feat: add permissionless TWAP oracle creation`
- `fix: resolve bootstrap mode price calculation`
- `docs: add DeFi lending example`

### Code Style

- Use clear variable names
- Add comments for complex logic
- Follow Solidity style guide for contracts
- Use async/await for JavaScript
- Keep functions small and focused

### Testing Guidelines

#### Smart Contracts

```javascript
// Add tests to test/SoraOracle.test.js
it("Should handle bootstrap mode correctly", async function() {
    // Test implementation
});
```

#### Integration Tests

```javascript
// Add to examples/ or scripts/
// Test with actual PancakeSwap pairs on testnet
```

### Documentation

- Update README.md for major changes
- Add examples for new features
- Update relevant docs in docs/
- Include code comments

## 📋 Pull Request Checklist

Before submitting, ensure:

- [ ] Code compiles without errors
- [ ] All tests pass (`npm test`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Code follows project style
- [ ] Commit messages are clear
- [ ] No sensitive data (private keys, etc.)

## 🔍 Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, PR will be merged
4. Your contribution will be in the next release!

## 💡 Areas We Need Help

### Smart Contracts
- Additional security audits
- Gas optimization
- New oracle types
- Enhanced TWAP mechanisms

### Examples
- More prediction market implementations
- DeFi protocol integrations
- Trading bot examples
- NFT use cases

### Documentation
- Video tutorials
- Integration guides
- Best practices
- Translations

### Tooling
- Frontend integrations
- Monitoring dashboards
- Analytics tools
- Developer utilities

## 🌟 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Featured in documentation

## 📞 Questions?

- Open a [Discussion](../../discussions)
- Join our community
- Ask in issues

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make Sora Oracle better!** 🚀
