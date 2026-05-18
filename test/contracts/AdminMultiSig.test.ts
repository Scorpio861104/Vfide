import { expect } from "chai";
import { ethers, time, type SignerWithAddress } from "./helpers/hardhatCompat";

async function expectRevert(action: Promise<unknown>) {
  let reverted = false;
  try {
    await action;
  } catch {
    reverted = true;
  }
  expect(reverted).to.equal(true);
}

describe("AdminMultiSig", function () {
  let multiSig: any;
  let token: any;
  let council: SignerWithAddress[];
  let nonCouncil: SignerWithAddress;
  let target: SignerWithAddress;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    council = signers.slice(0, 5);
    nonCouncil = signers[5]!;
    target = signers[6]!;

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("1000000"));
    await token.deployed();

    const Factory = await ethers.getContractFactory("AdminMultiSig");
    multiSig = await Factory.deploy(
      [
        council[0]!.address,
        council[1]!.address,
        council[2]!.address,
        council[3]!.address,
        council[4]!.address,
      ],
      token.address
    );
    await multiSig.deployed();
  });

  describe("Deployment", function () {
    it("sets council members and token", async function () {
      expect(await multiSig.isCouncilMember(council[0]!.address)).to.equal(true);
      expect(await multiSig.isCouncilMember(nonCouncil.address)).to.equal(false);
      expect(await multiSig.vfideToken()).to.equal(token.address);
      expect(await multiSig.executionGasLimit()).to.equal(500000);
    });

    it("rejects non-council governance mutation", async function () {
      await expectRevert(multiSig.connect(nonCouncil).setVetoMinStake(1));
    });
  });

  describe("Proposal Lifecycle", function () {
    it("creates config proposal with proposer auto-approval", async function () {
      const data = multiSig.interface.encodeFunctionData("setVetoMinStake", [123n]);
      const tx = await multiSig
        .connect(council[0]!)
        .createProposal(0, multiSig.address, data, "set min stake");
      await tx.wait();

      const proposal = await multiSig.getProposal(0);
      expect(proposal.proposer).to.equal(council[0]!.address);
      expect(proposal.approvalCount).to.equal(1);
      expect(await multiSig.hasApproved(0, council[0]!.address)).to.equal(true);
    });

    it("transitions to approved after 3 council approvals", async function () {
      const data = multiSig.interface.encodeFunctionData("setVetoMinStake", [456n]);
      await multiSig.connect(council[0]!).createProposal(0, multiSig.address, data, "approve me");

      await multiSig.connect(council[1]!).approveProposal(0);
      let proposal = await multiSig.getProposal(0);
      expect(proposal.status).to.equal(0); // Pending

      await multiSig.connect(council[2]!).approveProposal(0);
      proposal = await multiSig.getProposal(0);
      expect(proposal.status).to.equal(1); // Approved
    });

    it("cannot execute config proposal before timelock", async function () {
      const data = multiSig.interface.encodeFunctionData("setVetoMinStake", [789n]);
      await multiSig.connect(council[0]!).createProposal(0, multiSig.address, data, "timelock");
      await multiSig.connect(council[1]!).approveProposal(0);
      await multiSig.connect(council[2]!).approveProposal(0);

      await expectRevert(multiSig.connect(council[0]!).executeProposal(0));
    });

    it("executes config proposal after timelock and updates state", async function () {
      const newGasLimit = 700000n;
      const data = multiSig.interface.encodeFunctionData("setExecutionGasLimit", [newGasLimit]);
      await multiSig.connect(council[0]!).createProposal(0, multiSig.address, data, "execute update");
      await multiSig.connect(council[1]!).approveProposal(0);
      await multiSig.connect(council[2]!).approveProposal(0);

      await time.increase(24 * 60 * 60 + 1);

      await multiSig.connect(council[0]!).executeProposal(0);
      expect(await multiSig.executionGasLimit()).to.equal(newGasLimit);
    });

    it("requires 4 approvals for emergency proposal", async function () {
      const data = multiSig.interface.encodeFunctionData("setVetoMinStake", [3333n]);
      await multiSig.connect(council[0]!).createProposal(2, multiSig.address, data, "emergency change");

      await multiSig.connect(council[1]!).approveProposal(0);
      await multiSig.connect(council[2]!).approveProposal(0);
      await multiSig.connect(council[3]!).approveProposal(0);

      const proposal = await multiSig.getProposal(0);
      expect(proposal.approvalCount).to.equal(4);
      expect(proposal.status).to.equal(1); // Approved
    });

    it("blocks direct setExecutionGasLimit unless called via active proposal", async function () {
      await expectRevert(multiSig.connect(council[0]!).setExecutionGasLimit(700000));
    });

    it("requires veto quorum for config proposals", async function () {
      const data = multiSig.interface.encodeFunctionData("setVetoMinStake", [4444n]);
      await multiSig.connect(council[0]!).createProposal(0, multiSig.address, data, "veto me");

      await multiSig.connect(council[1]!).vetoProposal(0);
      let proposal = await multiSig.getProposal(0);
      expect(proposal.vetoCount).to.equal(1);
      expect(proposal.status).to.equal(0); // Pending

      await multiSig.connect(council[2]!).vetoProposal(0);
      proposal = await multiSig.getProposal(0);
      expect(proposal.vetoCount).to.equal(2);
      expect(proposal.status).to.equal(0); // Pending

      await multiSig.connect(council[3]!).vetoProposal(0);
      proposal = await multiSig.getProposal(0);
      expect(proposal.status).to.equal(3); // Vetoed
    });

    it("requires veto quorum of 4 for emergency proposals", async function () {
      const data = multiSig.interface.encodeFunctionData("setVetoMinStake", [5555n]);
      await multiSig.connect(council[0]!).createProposal(2, multiSig.address, data, "emergency veto quorum");

      await multiSig.connect(council[1]!).vetoProposal(0);
      await multiSig.connect(council[2]!).vetoProposal(0);
      await multiSig.connect(council[3]!).vetoProposal(0);

      let proposal = await multiSig.getProposal(0);
      expect(proposal.vetoCount).to.equal(3);
      expect(proposal.status).to.equal(0); // Pending

      await multiSig.connect(council[4]!).vetoProposal(0);
      proposal = await multiSig.getProposal(0);
      expect(proposal.vetoCount).to.equal(4);
      expect(proposal.status).to.equal(3); // Vetoed
    });
  });

  describe("ETH Receive", function () {
    it("rejects raw ETH transfers", async function () {
      await expectRevert(council[0]!.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      }));
    });
  });
});
