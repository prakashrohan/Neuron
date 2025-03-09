"use client";
import React, { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useReadContracts } from "wagmi";
import { ABI, contractAddress } from "../abis/SmartContractMarketplace";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Box,
  IconButton,
  Tooltip,
  TextField,
  Chip,
  Container,
  Paper,
  Avatar,
  Button,
  Divider,
  Skeleton,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  InputAdornment
} from "@mui/material";
import { formatEther } from "viem";
import { 
  InsertDriveFile as InsertDriveFileIcon,
  Search as SearchIcon,
  AccountBalanceWallet as WalletIcon,
  Code as CodeIcon,
  Tag as TagIcon,
  Person as PersonIcon,
  Clear as ClearIcon
} from "@mui/icons-material";

const ReadMarketplace = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState({ open: false, message: "", severity: "info" });
  const { writeContract } = useWriteContract();

  // Fetch total number of token IDs
  const { data: totalTokens } = useReadContract({
    abi: ABI,
    address: contractAddress,
    functionName: "getTotalTokenIds",
  });

  // Create an array of contract reading configurations
  const getContractConfigs = () => {
    if (!totalTokens) return [];

    const configs = [];
    for (let i = 0; i < Number(totalTokens); i++) {
      configs.push({
        abi: ABI,
        address: contractAddress,
        functionName: "getContractDetails",
        args: [i + 1],
      });
      configs.push({
        abi: ABI,
        address: contractAddress,
        functionName: "tokenURI",
        args: [i + 1],
      });
    }
    return configs;
  };
  
  const { data: contractsData } = useReadContracts({
    contracts: getContractConfigs(),
  });

  useEffect(() => {
    if (!contractsData) return;
    const processContractsData = async () => {
      const fetchedContracts = [];

      for (let i = 0; i < contractsData.length; i += 2) {
        const contractResult = contractsData[i];
        const uriResult = contractsData[i + 1];

        if (!contractResult?.result || !uriResult?.result) continue;

        try {
          const [creator, tags, usageFee] = contractResult.result;
          const tokenURI = uriResult.result;

          fetchedContracts.push({
            tokenId: i / 2 + 1,
            creator,
            tags,
            usageFee: Number(usageFee),
            tokenURI,
          });
        } catch (error) {
          console.error(`Error processing contract ${i / 2 + 1}:`, error);
        }
      }

      setContracts(fetchedContracts);
      setLoading(false);
    };

    processContractsData();
  }, [contractsData]);

  const getIpfsUrl = (tokenURI) => {
    return tokenURI.startsWith('ipfs://')
      ? `https://ipfs.io/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
  };

  const handleDownload = async (tokenURI, id, price) => {
    try {
      setNotification({ open: true, message: "Processing your purchase...", severity: "info" });
      
      const tx = await writeContract({
        abi: ABI,
        address: contractAddress,
        functionName: "accessContract",
        args: [id],
        value: price
      });
      
      setNotification({ open: true, message: "Purchase successful! Downloading contract...", severity: "success" });

      const ipfsUrl = getIpfsUrl(tokenURI);
      const response = await fetch(ipfsUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = tokenURI.split("/").pop().replace(/\.[^/.]+$/, "") + ".sol";
      a.download = `contract-${filename}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      setNotification({ open: true, message: "Transaction failed. Please try again.", severity: "error" });
    }
  };

  // Filter contracts based on search query
  const filteredContracts = contracts.filter((contract) =>
    contract.tags.some((tag) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Helper to truncate address for display
  const truncateAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // To close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <CodeIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Smart Contracts Marketplace
          </Typography>
          <WalletIcon />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2,
            background: 'linear-gradient(to right, #f5f7fa, #e4e7eb)'
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: "medium" }}>
            Discover Smart Contracts
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Browse and purchase verified smart contracts from developers around the world
          </Typography>
          
          {!loading && (
            <Paper 
              elevation={1} 
              sx={{ 
                p: 0.5, 
                display: 'flex', 
                alignItems: 'center',
                borderRadius: 2,
                mb: 2
              }}
            >
              <TextField
                fullWidth
                placeholder="Search by tags (e.g., DeFi, NFT, Exchange)"
                variant="standard"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton 
                        edge="end" 
                        onClick={handleClearSearch}
                        size="small"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  disableUnderline: true,
                  sx: { 
                    ml: 1,
                    fontSize: '1rem',
                    '& input': { 
                      py: 1.5,
                      px: 0.5
                    }
                  }
                }}
              />
            </Paper>
          )}
          
          {searchQuery && (
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing results for:
              </Typography>
              <Chip 
                label={searchQuery}
                onDelete={handleClearSearch}
                color="primary"
                size="small"
                sx={{ ml: 1 }}
              />
            </Box>
          )}
        </Paper>

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item}>
                <Card elevation={2} sx={{ borderRadius: 2, height: "100%" }}>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={40} />
                    <Skeleton variant="text" width="90%" height={30} />
                    <Skeleton variant="text" width="70%" height={30} />
                    <Skeleton variant="text" width="80%" height={30} />
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <Skeleton variant="rectangular" width={60} height={32} />
                      <Skeleton variant="rectangular" width={60} height={32} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <>
            {filteredContracts.length > 0 ? (
              <Grid container spacing={3}>
                {filteredContracts.map(({ tokenId, creator, tags, usageFee, tokenURI }) => (
                  <Grid item xs={12} sm={6} md={4} key={tokenId}>
                    <Card 
                      elevation={2} 
                      sx={{ 
                        borderRadius: 2, 
                        height: "100%",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: 6
                        }
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                          <Avatar sx={{ bgcolor: "primary.main", mr: 1 }}>
                            <CodeIcon />
                          </Avatar>
                          <Typography variant="h6">Contract #{tokenId}</Typography>
                        </Box>
                        
                        <Divider sx={{ mb: 2 }} />
                        
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                          <PersonIcon color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            Created by:
                          </Typography>
                          <Tooltip title={creator}>
                            <Typography variant="body2" sx={{ ml: 0.5, fontWeight: "medium" }}>
                              {truncateAddress(creator)}
                            </Typography>
                          </Tooltip>
                        </Box>
                        
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                          <WalletIcon color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            Usage Fee:
                          </Typography>
                          <Typography variant="body1" color="primary" sx={{ ml: 0.5, fontWeight: "bold" }}>
                            {formatEther(usageFee.toString())} ETH
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                            <TagIcon color="action" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              Tags:
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {tags.map((tag, index) => (
                              <Chip 
                                key={index} 
                                label={tag} 
                                size="small" 
                                variant="outlined"
                                onClick={() => setSearchQuery(tag)}
                                sx={{ 
                                  bgcolor: "rgba(0,0,0,0.03)",
                                  cursor: "pointer"
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                        
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          startIcon={<InsertDriveFileIcon />}
                          onClick={() => tokenURI && handleDownload(tokenURI, tokenId, usageFee)}
                          sx={{ 
                            mt: 1,
                            textTransform: "none",
                            borderRadius: 1.5
                          }}
                        >
                          Purchase & Download
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)" }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No contracts found matching "{searchQuery}"
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Try using different keywords or browse all available contracts
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={handleClearSearch}
                  startIcon={<ClearIcon />}
                >
                  Clear Search
                </Button>
              </Paper>
            )}
          </>
        )}
      </Container>
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReadMarketplace;