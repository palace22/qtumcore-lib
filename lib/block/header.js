const util = require('util')
const Hash = require('../crypto/hash')
const BufferReader = require('../encoding/bufferreader')
const BufferWriter = require('../encoding/bufferwriter')

//const GENESIS_BITS = 0x1d00ffff
const GENESIS_BITS = 0x1f00ffff
class Header {
  #hash = null

  constructor({
    version, prevHash, merkleRoot, timestamp, bits, nonce,
    hashStateRoot, hashUTXORoot, stakePrevTxId, stakeOutputIndex, signature
  }) {
    this.version = version
    this.prevHash = prevHash || Buffer.alloc(32)
    this.merkleRoot = merkleRoot
    this.timestamp = timestamp
    this.bits = bits
    this.nonce = nonce
    this.hashStateRoot = hashStateRoot
    this.hashUTXORoot = hashUTXORoot
    this.stakePrevTxId = stakePrevTxId
    this.stakeOutputIndex = stakeOutputIndex
    this.signature = signature
  }

  static fromBuffer(buffer) {
    return Header.fromBufferReader(new BufferReader(buffer))
  }

  static fromBufferReader(reader) {
    let version = reader.readInt32LE()
    let prevHash = Buffer.from(reader.read(32)).reverse()
    let merkleRoot = Buffer.from(reader.read(32)).reverse()
    let timestamp = reader.readUInt32LE()
    let bits = reader.readUInt32LE()
    let nonce = reader.readUInt32LE()
    let hashStateRoot = Buffer.from(reader.read(32)).reverse()
    let hashUTXORoot = Buffer.from(reader.read(32)).reverse()
    let stakePrevTxId = Buffer.from(reader.read(32)).reverse()
    let stakeOutputIndex = reader.readUInt32LE()
    let signature = reader.readVarLengthBuffer()
    return new Header({
      version, prevHash, merkleRoot, timestamp, bits, nonce,
      hashStateRoot, hashUTXORoot, stakePrevTxId, stakeOutputIndex, signature
    })
  }

  toBuffer() {
    let writer = new BufferWriter()
    this.toBufferWriter(writer)
    return writer.toBuffer()
  }

  toBufferWriter(writer) {
    writer.writeInt32LE(this.version)
    writer.write(Buffer.from(this.prevHash).reverse())
    writer.write(Buffer.from(this.merkleRoot).reverse())
    writer.writeUInt32LE(this.timestamp)
    writer.writeUInt32LE(this.bits)
    writer.writeUInt32LE(this.nonce)
    writer.write(Buffer.from(this.hashStateRoot).reverse())
    writer.write(Buffer.from(this.hashUTXORoot).reverse())
    writer.write(Buffer.from(this.stakePrevTxId).reverse())
    writer.writeUInt32LE(this.stakeOutputIndex)
    writer.writeVarLengthBuffer(this.signature)
  }

  get id() {
    return this.hash
  }

  get hash() {
    this.#hash = this.#hash || Hash.sha256sha256(this.toBuffer()).reverse()
    return this.#hash
  }

  [util.inspect.custom](depth = 0) {
    if (depth === 0) {
      return `<Header ${this.hash.toString('hex')}>`
    } else {
      return `Header ${JSON.stringify({
        hash: this.hash.toString('hex'),
        version: this.version,
        prevHash: this.prevHash.toString('hex'),
        timestamp: this.timestamp,
        bits: this.bits,
        nonce: this.nonce,
        hashStateRoot: this.hashStateRoot.toString('hex'),
        hashUTXORoot: this.hashUTXORoot.toString('hex'),
        stakePrevTxId: this.stakePrevTxId.toString('hex'),
        stakeOutputIndex: this.stakeOutputIndex,
        signature: this.signature.toString('hex')
      }, null, 2)}`
    }
  }

  isProofOfStake() {
    return Buffer.compare(this.stakePrevTxId, Buffer.alloc(32)) !== 0 && this.stakeOutputIndex !== 0xffffffff
  }

  get difficulty() {
    function getTargetDifficulty(bits) {
      return (bits & 0xffffff) * 2 ** ((bits >>> 24) - 3 << 3)
    }
    return getTargetDifficulty(GENESIS_BITS) / getTargetDifficulty(this.bits)
  }
}

module.exports = Header
